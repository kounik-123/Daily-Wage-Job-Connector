<img src="/images/Daily-Wage-Job-Connector.jpg" width="300"/>

# Daily Wage Job Connector (DWJC)

Full-stack Node.js + Express + EJS app connecting Users (job posters) and Workers (job seekers). Includes role-based auth, job flows, wallet stats (Chart.js), real-time updates (Socket.io), and email notifications (Nodemailer).

## Tech Stack
- Express.js, EJS, Bootstrap 5
- MongoDB (Mongoose)
- JWT + bcryptjs
- Socket.io
- Nodemailer
- Chart.js

## Quick Start

1. Clone dependencies and set env
```
cp .env.example .env   # On Windows: copy .env.example .env
```
Edit `.env` to set `MONGO_URI`, `JWT_SECRET`, and SMTP if available.

2. Install dependencies
```
npm install
```

3. Run
```
npm run dev
# or
npm start
```

App runs at http://localhost:3000

## Default Flows
- User role:
  - Create job: `Jobs > Create a Job`
  - See active/past jobs; mark complete
- Worker role:
  - See available jobs; apply; mark complete
- Wallet pages show simple summaries with charts.

## Real-time & Email
- Socket events:
  - `job:new`, `job:applied`, `job:completed`
- Emails sent when SMTP is configured via `.env`:
  - New job → workers
  - Applied → poster
  - Completed → poster + worker

## Project Structure
- `app.js` – server, middleware, routes, sockets
- `routes/` – `auth`, `jobs`, `wallet`, `notifications`
- `models/` – `User`, `Job`, `Notification`
- `tools/` – `auth` middleware, `mailer`
- `views/` – EJS templates (user, worker, common)
- `public/` – CSS/JS assets
- `uploads/` – profile photo uploads (multer)

## Notes
- This is a minimal MVP; validation/edge cases are light.
- Use a real SMTP or set up a testing SMTP service for email (e.g., Mailtrap).
