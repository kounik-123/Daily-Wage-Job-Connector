import express from 'express';
import { authRequired } from '../tools/auth.js';
import User from '../models/User.js';

const router = express.Router();

router.get('/', authRequired, async (req, res, next) => {
  try {
    const me = await User.findById(req.user.id).select('name email role');
    res.render('settings', { title: 'Settings', me });
  } catch (err) { next(err); }
});

router.post('/', authRequired, async (req, res, next) => {
  try {
    const { name } = req.body;
    if (name && name.trim()) {
      await User.findByIdAndUpdate(req.user.id, { name: name.trim() });
    }
    res.redirect('/settings');
  } catch (err) { next(err); }
});

export default router;
