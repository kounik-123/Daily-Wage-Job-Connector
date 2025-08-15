import express from 'express';
import { authRequired, requireRole } from '../tools/auth.js';
import Wishlist from '../models/Wishlist.js';
import Job from '../models/Job.js';

const router = express.Router();

// GET /wishlist - worker view
router.get('/', authRequired, requireRole(['worker']), async (req, res, next) => {
  try {
    const items = await Wishlist.find({ userId: req.user.id }).populate('jobId');
    const jobs = items.map(i => i.jobId).filter(Boolean);
    res.render('worker/wishlist', { title: 'My Wishlist', jobs });
  } catch (err) { next(err); }
});

// POST /wishlist/:jobId/toggle - worker toggle
router.post('/:jobId/toggle', authRequired, requireRole(['worker']), async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const found = await Wishlist.findOne({ userId: req.user.id, jobId });
    if (found) {
      await Wishlist.deleteOne({ _id: found._id });
    } else {
      // Ensure job exists and is open
      const job = await Job.findById(jobId);
      if (job && job.status === 'open') {
        await Wishlist.create({ userId: req.user.id, jobId });
      }
    }
    res.redirect('back');
  } catch (err) { next(err); }
});

export default router;
