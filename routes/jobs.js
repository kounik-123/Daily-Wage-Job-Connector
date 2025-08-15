import express from 'express';
import { authRequired, requireRole } from '../tools/auth.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import { getIO } from '../sockets/index.js';
import Notification from '../models/Notification.js';
import { sendMail } from '../tools/mailer.js';

const router = express.Router();

// GET /jobs - create job form (User)
router.get('/', authRequired, requireRole(['user']), (req, res) => {
  res.render('jobs/create', { title: 'Create Job' });
});

// GET /jobs/:id/edit - edit form (poster only)
router.get('/:id/edit', authRequired, requireRole(['user']), async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).render('404', { title: 'Not Found' });
    if (job.postedBy.toString() !== req.user.id) return res.status(403).send('Forbidden');
    res.render('jobs/edit', { title: `Edit Job: ${job.title}`, job });
  } catch (err) {
    next(err);
  }
});

// POST /jobs/:id/edit - update job (poster only)
router.post('/:id/edit', authRequired, requireRole(['user']), async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).render('404', { title: 'Not Found' });
    if (job.postedBy.toString() !== req.user.id) return res.status(403).send('Forbidden');

    const { title, description, wage, location, deadline } = req.body;
    job.title = title;
    job.description = description;
    job.wage = Number(wage);
    job.location = location;
    job.deadline = deadline || null;
    await job.save();
    // Specific toast for update
    res.redirect('/jobs/active?updated=1');
  } catch (err) {
    next(err);
  }
});

// POST /jobs - create job (User)
router.post('/', authRequired, requireRole(['user']), async (req, res, next) => {
  try {
    const { title, description, wage, location, deadline } = req.body;
    const job = await Job.create({
      title,
      description,
      wage: Number(wage),
      location,
      deadline,
      status: 'open',
      postedBy: req.user.id
    });

    // socket broadcast to workers
    getIO().emit('job:new', { jobId: job._id, title: job.title });

    // Notify all workers in app and via email (best-effort)
    const workers = await User.find({ role: 'worker' }).select('_id email name');
    if (workers.length) {
      const notifications = workers.map(w => ({
        type: 'New Job',
        message: `New job posted: ${job.title}`,
        recipientId: w._id
      }));
      await Notification.insertMany(notifications);

      // Email (fire-and-forget)
      const subject = `New Job Posted: ${job.title}`;
      const html = `<p>A new job has been posted.</p><p><strong>${job.title}</strong> - ${job.description}</p>`;
      await Promise.allSettled(workers.filter(w=>w.email).map(w => sendMail({ to: w.email, subject, html })));
    }

    // Redirect with a flag so the UI shows a specific toast
    res.redirect('/jobs/active?created=1');
  } catch (err) {
    next(err);
  }
});

// GET /jobs/active - jobs posted by user that are open/active
router.get('/active', authRequired, async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    const buildTextFilter = () => {
      if (!q) return undefined;
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(escaped, 'i');
      return { $or: [{ title: re }, { description: re }, { location: re }] };
    };

    if (req.user.role === 'user') {
      const base = { postedBy: req.user.id, status: { $in: ['open', 'active'] } };
      const text = buildTextFilter();
      const query = text ? { ...base, ...text } : base;
      const jobs = await Job.find(query).populate('appliedBy', 'name');
      return res.render('user/active-jobs', { title: 'Active Jobs', jobs, q });
    }
    if (req.user.role === 'worker') {
      const base = { appliedBy: req.user.id, status: { $in: ['active'] } };
      const text = buildTextFilter();
      const query = text ? { ...base, ...text } : base;
      const jobs = await Job.find(query).populate('postedBy', 'name');
      return res.render('worker/active-jobs', { title: 'Active Jobs', jobs, q });
    }
    res.status(403).send('Forbidden');
  } catch (err) {
    next(err);
  }
});

// GET /jobs/past - completed
router.get('/past', authRequired, async (req, res, next) => {
  try {
    if (req.user.role === 'user') {
      const jobs = await Job.find({ postedBy: req.user.id, status: 'completed' }).populate('appliedBy', 'name');
      return res.render('user/past-jobs', { title: 'Past Jobs', jobs });
    }
    if (req.user.role === 'worker') {
      const jobs = await Job.find({ appliedBy: req.user.id, status: 'completed' }).populate('postedBy', 'name');
      return res.render('worker/past-jobs', { title: 'Past Jobs', jobs });
    }
    res.status(403).send('Forbidden');
  } catch (err) {
    next(err);
  }
});

// GET /jobs/available - workers fetch open jobs
router.get('/available', authRequired, requireRole(['worker']), async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    const findQuery = { status: 'open' };
    if (q) {
      // Escape regex special chars and search case-insensitively across key fields
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(escaped, 'i');
      findQuery.$or = [
        { title: re },
        { description: re },
        { location: re }
      ];
    }
    const jobs = await Job.find(findQuery).populate('postedBy', 'name');
    // Wishlist ids for current worker
    const Wishlist = (await import('../models/Wishlist.js')).default;
    const wished = await Wishlist.find({ userId: req.user.id }).select('jobId');
    const wishlistIds = wished.map(w => String(w.jobId));
    res.render('worker/available-jobs', { title: 'Available Jobs', jobs, wishlistIds, q });
  } catch (err) {
    next(err);
  }
});

// POST /jobs/:id/apply - worker applies
router.post('/:id/apply', authRequired, requireRole(['worker']), async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id).populate('postedBy');
    if (!job || job.status !== 'open') return res.status(400).json({ message: 'Job not available' });
    job.status = 'active';
    job.appliedBy = req.user.id;
    await job.save();

    // notify user
    getIO().emit('job:applied', { jobId: job._id, workerId: req.user.id });

    // In-app notification to job poster
    await Notification.create({
      type: 'Job Application',
      message: `Applied by ${req.user.name} for ${job.title}`,
      recipientId: job.postedBy._id
    });

    // Email poster (best-effort)
    if (job.postedBy?.email) {
      await sendMail({
        to: job.postedBy.email,
        subject: `Your job received an application: ${job.title}`,
        html: `<p>${req.user.name} applied for your job <strong>${job.title}</strong>.</p>`
      });
    }
    // Specific toast for worker after applying
    res.redirect('/jobs/active?applied=1');
  } catch (err) {
    next(err);
  }
});

// POST /jobs/:id/complete - mark complete
router.post('/:id/complete', authRequired, async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    if (req.user.role === 'user' && job.postedBy.toString() !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
    if (req.user.role === 'worker' && job.appliedBy?.toString() !== req.user.id) return res.status(403).json({ message: 'Forbidden' });

    job.status = 'completed';
    await job.save();

    getIO().emit('job:completed', { jobId: job._id });

    // In-app notifications to both parties
    const notifs = [];
    if (job.postedBy) notifs.push({ type: 'Job Completed', message: `Job completed: ${job.title}`, recipientId: job.postedBy });
    if (job.appliedBy) notifs.push({ type: 'Job Completed', message: `Job completed: ${job.title}`, recipientId: job.appliedBy });
    if (notifs.length) await Notification.insertMany(notifs);

    // Emails (best-effort)
    const poster = await User.findById(job.postedBy).select('email');
    const worker = await User.findById(job.appliedBy).select('email');
    const subject = `Job Completed: ${job.title}`;
    const html = `<p>The job <strong>${job.title}</strong> has been marked completed.</p>`;
    await Promise.allSettled([
      poster?.email ? sendMail({ to: poster.email, subject, html }) : Promise.resolve(),
      worker?.email ? sendMail({ to: worker.email, subject, html }) : Promise.resolve()
    ]);
    // Specific toast for completion
    res.redirect('/jobs/past?completed=1');
  } catch (err) {
    next(err);
  }
});

// POST /jobs/:id/delete - delete job (poster only)
router.post('/:id/delete', authRequired, requireRole(['user']), async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).render('404', { title: 'Not Found' });
    if (job.postedBy.toString() !== req.user.id) return res.status(403).send('Forbidden');

    const hadWorker = !!job.appliedBy;
    const title = job.title;
    const workerId = job.appliedBy;

    await job.deleteOne();

    if (hadWorker && workerId) {
      await Notification.create({
        type: 'Job Cancelled',
        message: `Job removed by poster: ${title}`,
        recipientId: workerId
      });
    }

    getIO().emit('job:deleted', { jobId: req.params.id });

    res.redirect('/jobs/active?deleted=1');
  } catch (err) {
    next(err);
  }
});

// GET /jobs/:id - view job details (authorized parties only)
router.get('/:id', authRequired, async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id).populate('postedBy', 'name email').populate('appliedBy', 'name email');
    if (!job) return res.status(404).render('404', { title: 'Not Found' });

    const isPoster = job.postedBy && job.postedBy._id?.toString() === req.user.id;
    const isWorker = job.appliedBy && job.appliedBy._id?.toString() === req.user.id;
    const canView = (req.user.role === 'user' && isPoster) || (req.user.role === 'worker' && isWorker);
    if (!canView) return res.status(403).send('Forbidden');

    res.render('jobs/details', { title: `Job: ${job.title}`, job });
  } catch (err) {
    next(err);
  }
});

export default router;
