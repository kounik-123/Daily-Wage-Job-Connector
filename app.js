import dotenv from 'dotenv';
import path from 'path';
import express from 'express';
import http from 'http';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import mongoose from 'mongoose';
import expressLayouts from 'express-ejs-layouts';
import jwt from 'jsonwebtoken';

import authRoutes from './routes/auth.js';
import jobRoutes from './routes/jobs.js';
import walletRoutes from './routes/wallet.js';
import notificationRoutes from './routes/notifications.js';
import { initSocket } from './sockets/index.js';
import wishlistRoutes from './routes/wishlist.js';
import mailRoutes from './routes/mail.js';
import settingsRoutes from './routes/settings.js';
import dashboardsRoutes from './routes/dashboards.js';
import Notification from './models/Notification.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = initSocket(server);

// Middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Expose current path to all views for active nav states
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next();
});

// View engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'partials/layout');

// Expose user to all views; default null
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
app.use((req, res, next) => {
  res.locals.user = null;
  try {
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      let payload;
      try { payload = jwt.verify(token, JWT_SECRET); } catch (_) { payload = jwt.decode(token); }
      if (payload && payload.id) {
        const role = (payload.role || '').toString().toLowerCase();
        req.user = req.user || { id: payload.id, role, name: payload.name };
        res.locals.user = req.user;
      }
    }
  } catch (_) {}
  next();
});

// Unread notifications count for badge
app.use(async (req, res, next) => {
  try {
    if (req.user?.id) {
      res.locals.unreadCount = await Notification.countDocuments({ recipientId: req.user.id, isRead: false });
    } else {
      res.locals.unreadCount = 0;
    }
  } catch (_) {
    res.locals.unreadCount = 0;
  }
  next();
});

// MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/dwjc';
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.get('/', (req, res) => {
  res.render('index', { title: 'Daily Wage Job Connector' });
});

// Marketing pages
app.get('/how-it-works', (req, res) => {
  res.render('how-it-works', { title: 'How It Works' });
});
app.get('/features', (req, res) => {
  res.render('features', { title: 'Features' });
});
app.get('/testimonials', (req, res) => {
  res.render('testimonials', { title: 'Testimonials' });
});
app.get('/contact', (req, res) => {
  res.render('contact', { title: 'Contact' });
});
app.use('/auth', authRoutes);
app.use('/jobs', jobRoutes);
app.use('/wallet', walletRoutes);
app.use('/notifications', notificationRoutes);
app.use('/wishlist', wishlistRoutes);
app.use('/mail', mailRoutes);
app.use('/settings', settingsRoutes);
app.use('/dashboards', dashboardsRoutes);

// 404
app.use((req, res) => {
  if (req.accepts('html')) return res.status(404).render('404', { title: 'Not Found' });
  res.status(404).json({ message: 'Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  if (req.accepts('html')) return res.status(500).render('500', { title: 'Server Error', error: err });
  res.status(500).json({ message: 'Server Error' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

