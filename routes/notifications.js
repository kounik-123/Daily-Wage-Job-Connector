import express from 'express';
import { authRequired } from '../tools/auth.js';
import Notification from '../models/Notification.js';

const router = express.Router();

router.get('/', authRequired, async (req, res, next) => {
  try {
    const items = await Notification.find({ recipientId: req.user.id }).sort({ createdAt: -1 });
    res.render('common/notifications', { title: 'Notifications', items });
  } catch (err) {
    next(err);
  }
});

router.post('/read', authRequired, async (req, res, next) => {
  try {
    await Notification.updateMany({ recipientId: req.user.id, isRead: false }, { $set: { isRead: true } });
    res.redirect('/notifications?read=1');
  } catch (err) {
    next(err);
  }
});

export default router;
