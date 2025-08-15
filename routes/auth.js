import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

router.get('/login', (req, res) => res.render('auth/login', { title: 'Login' }));
router.get('/signup', (req, res) => res.render('auth/signup', { title: 'Signup' }));

router.post(
  '/signup',
  upload.single('profilePhoto'),
  [
    body('name').notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('role').isIn(['user', 'worker'])
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { name, email, password, role } = req.body;
      const existing = await User.findOne({ email });
      if (existing) return res.status(400).json({ message: 'Email already registered' });

      const hashed = await bcrypt.hash(password, 10);
      const user = await User.create({ name, email, password: hashed, role, profilePhoto: req.file?.path });

      const token = jwt.sign({ id: user._id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
      res.cookie('token', token, { httpOnly: true });

      const redirectPath = user.role === 'user' ? '/jobs/active' : '/jobs/available';
      res.redirect(`${redirectPath}?signup=1`);
    } catch (err) {
      next(err);
    }
  }
);

router.post('/login', [body('email').isEmail(), body('password').notEmpty()], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const first = errors.array()[0];
      return res.status(400).render('auth/login', { title: 'Login', error: first?.msg || 'Please provide valid credentials' });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).render('auth/login', { title: 'Login', error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).render('auth/login', { title: 'Login', error: 'Invalid credentials' });

    // Use the user's stored role, not the submitted role
    const token = jwt.sign({ id: user._id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true });

    const redirectPath = user.role === 'user' ? '/jobs/active' : '/jobs/available';
    res.redirect(`${redirectPath}?login=1`);
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
});

export default router;
