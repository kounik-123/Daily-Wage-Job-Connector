import express from 'express';
import { authRequired } from '../tools/auth.js';
import Job from '../models/Job.js';

const router = express.Router();

router.get('/', authRequired, async (req, res, next) => {
  try {
    if (req.user.role === 'user') {
      const completed = await Job.find({ postedBy: req.user.id, status: 'completed' }).sort({ updatedAt: -1 }).limit(20).lean();
      const active = await Job.find({ postedBy: req.user.id, status: 'active' }).sort({ updatedAt: -1 }).limit(20).lean();
      const paymentsMade = completed.length;
      const pending = active.length;
      const totalSpending = completed.reduce((sum, j) => sum + Number(j.wage || 0), 0);
      const pendingAmount = active.reduce((sum, j) => sum + Number(j.wage || 0), 0);
      const recent = [...completed, ...active]
        .sort((a,b)=> new Date(b.updatedAt||b.createdAt) - new Date(a.updatedAt||a.createdAt))
        .slice(0, 10)
        .map(j => ({ id: String(j._id), title: j.title, amount: Number(j.wage||0), status: j.status, date: j.updatedAt || j.createdAt }));
      const summary = { paymentsMade, pending, totalSpending, pendingAmount, recent };
      return res.render('user/wallet', { title: 'Wallet', summary });
    }
    if (req.user.role === 'worker') {
      const receivedJobs = await Job.find({ appliedBy: req.user.id, status: 'completed' }).sort({ updatedAt: -1 }).limit(20).lean();
      const pendingJobs = await Job.find({ appliedBy: req.user.id, status: 'active' }).sort({ updatedAt: -1 }).limit(20).lean();
      const received = receivedJobs.length;
      const pending = pendingJobs.length;
      const earnings = receivedJobs.reduce((sum, j) => sum + Number(j.wage || 0), 0);
      const pendingEarnings = pendingJobs.reduce((sum, j) => sum + Number(j.wage || 0), 0);
      const recent = [...receivedJobs, ...pendingJobs]
        .sort((a,b)=> new Date(b.updatedAt||b.createdAt) - new Date(a.updatedAt||a.createdAt))
        .slice(0, 10)
        .map(j => ({ id: String(j._id), title: j.title, amount: Number(j.wage||0), status: j.status, date: j.updatedAt || j.createdAt }));
      const summary = { received, pending, earnings, pendingEarnings, recent };
      return res.render('worker/wallet', { title: 'Wallet', summary });
    }
    res.status(403).send('Forbidden');
  } catch (err) {
    next(err);
  }
});

export default router;
