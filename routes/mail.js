import express from 'express';
import { authRequired } from '../tools/auth.js';
import { sendMail } from '../tools/mailer.js';

const router = express.Router();

// GET /mail - simple test mail form
router.get('/', authRequired, (req, res) => {
  const { ok, err } = req.query;
  res.render('mail', { title: 'Mail', ok, err });
});

// POST /mail - send a test mail
router.post('/', authRequired, async (req, res) => {
  const { to, subject, message } = req.body;
  try {
    const target = to || req.user.email;
    await sendMail({ to: target, subject: subject || 'DWJC Test Email', html: `<p>${message || 'Hello from DWJC.'}</p>` });
    return res.redirect('/mail?ok=1');
  } catch (e) {
    return res.redirect('/mail?err=1');
  }
});

export default router;
