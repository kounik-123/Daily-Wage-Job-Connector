import express from 'express';
import { authRequired, requireRole } from '../tools/auth.js';
import Job from '../models/Job.js';
import Notification from '../models/Notification.js';

const router = express.Router();

// Worker Dashboard
router.get('/worker', authRequired, requireRole(['worker']), async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Stats
    const [appliedCount, completedJobs, activeJobs] = await Promise.all([
      Job.countDocuments({ appliedBy: userId }),
      Job.find({ appliedBy: userId, status: 'completed' }).select('wage updatedAt'),
      Job.find({ appliedBy: userId, status: 'active' }).select('wage')
    ]);

    const jobsCompleted = completedJobs.length;
    const pendingPayments = activeJobs.reduce((sum, j) => sum + (j.wage || 0), 0);
    const totalEarnings = completedJobs.reduce((sum, j) => sum + (j.wage || 0), 0);

    // Monthly earnings (last 12 months)
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (11 - i));
      return { key: `${d.getFullYear()}-${d.getMonth() + 1}`.padStart(7, '0'), label: d.toLocaleString('default', { month: 'short' }) };
    });
    const earningsByMonth = months.map(m => ({ label: m.label, total: 0 }));
    completedJobs.forEach(j => {
      const d = new Date(j.updatedAt || j.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`.padStart(7, '0');
      const idx = months.findIndex(m => m.key === key);
      if (idx >= 0) earningsByMonth[idx].total += (j.wage || 0);
    });

    // Recommended jobs: open jobs not yet applied by user
    const recommendedJobs = await Job.find({ status: 'open' }).limit(6).select('title wage location');

    // Messages preview: recent notifications
    const messages = await Notification.find({ recipientId: userId }).sort({ createdAt: -1 }).limit(5);

    res.render('worker/dashboard', {
      title: 'Worker Dashboard',
      stats: {
        totalApplied: appliedCount,
        jobsCompleted,
        currentBalance: totalEarnings,
        pendingPayments
      },
      earningsByMonth,
      recommendedJobs,
      messages
    });
  } catch (err) {
    next(err);
  }
});

// User Dashboard
router.get('/user', authRequired, requireRole(['user']), async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [postedJobs, activeJobs, completedJobs, notifications] = await Promise.all([
      Job.find({ postedBy: userId }).select('status wage title appliedBy createdAt updatedAt').populate('appliedBy', 'name email'),
      Job.find({ postedBy: userId, status: 'active' }).select('wage title'),
      Job.find({ postedBy: userId, status: 'completed' }).select('wage title'),
      Notification.find({ recipientId: userId }).sort({ createdAt: -1 }).limit(5)
    ]);

    const totalJobsPosted = postedJobs.length;
    const jobsInProgress = activeJobs.length;
    const totalPaid = completedJobs.reduce((sum, j) => sum + (j.wage || 0), 0);
    const pendingPayments = activeJobs.reduce((sum, j) => sum + (j.wage || 0), 0);

    // Recent applicants: take latest appliedBy from active or completed jobs
    const recentApplicants = postedJobs
      .filter(j => j.appliedBy)
      .slice(0, 8)
      .map(j => ({
        name: j.appliedBy?.name || 'Applicant',
        email: j.appliedBy?.email || '',
        jobTitle: j.title
      }));

    // Active job posts
    const activeJobPosts = postedJobs.filter(j => ['open', 'active'].includes(j.status)).slice(0, 8);

    res.render('user/dashboard', {
      title: 'User Dashboard',
      stats: { totalJobsPosted, jobsInProgress, totalPaid, pendingPayments },
      recentApplicants,
      activeJobPosts,
      notifications
    });
  } catch (err) {
    next(err);
  }
});

export default router;
