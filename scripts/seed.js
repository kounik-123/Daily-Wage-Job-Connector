import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Notification from '../models/Notification.js';

dotenv.config();

// Align with app.js which uses MONGO_URI; still accept MONGODB_URI as fallback
const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dwjc';
const DO_RESET = process.argv.includes('--reset');

async function connect() {
  await mongoose.connect(MONGODB_URI, { autoIndex: true });
  console.log('MongoDB connected:', MONGODB_URI);
}

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function seed() {
  if (DO_RESET) {
    console.log('Reset flag detected, clearing collections...');
    await Promise.all([
      User.deleteMany({}),
      Job.deleteMany({}),
      Notification.deleteMany({})
    ]);
    console.log('Collections cleared.');
  }

  const password = await bcrypt.hash('Password123!', 10);

  // 6 users: 3 job posters (user), 3 workers
  const usersData = [
    { name: 'Alice Johnson', email: 'alice@example.com', role: 'user', walletBalance: 120.5 },
    { name: 'Bob Smith', email: 'bob@example.com', role: 'user', walletBalance: 340.0 },
    { name: 'Clara Lee', email: 'clara@example.com', role: 'user', walletBalance: 75.25 },
    { name: 'Ravi Kumar', email: 'ravi@example.com', role: 'worker', walletBalance: 58.0 },
    { name: 'Fatima Noor', email: 'fatima@example.com', role: 'worker', walletBalance: 214.7 },
    { name: 'Diego Morales', email: 'diego@example.com', role: 'worker', walletBalance: 132.3 }
  ].map(u => ({ ...u, password }));

  // Upsert users to avoid duplicate email errors on re-run without --reset
  const userDocs = [];
  for (const u of usersData) {
    const doc = await User.findOneAndUpdate(
      { email: u.email },
      { $setOnInsert: u },
      { new: true, upsert: true }
    );
    userDocs.push(doc);
  }

  const posters = userDocs.filter(u => u.role === 'user');
  const workers = userDocs.filter(u => u.role === 'worker');

  const jobTemplates = [
    { title: 'House Painting', description: 'Paint a 2BHK apartment with materials provided.', wage: 120, location: 'Salt Lake, Kolkata, WB' },
    { title: 'Garden Cleanup', description: 'Clean backyard, remove weeds, trim bushes.', wage: 60, location: 'Baner, Pune, MH' },
    { title: 'Furniture Assembly', description: 'Assemble IKEA wardrobe and desk.', wage: 45, location: 'HSR Layout, Bengaluru, KA' },
    { title: 'Appliance Installation', description: 'Install washing machine and check plumbing.', wage: 70, location: 'Gachibowli, Hyderabad, TS' },
    { title: 'Warehouse Helper', description: 'Load/unload boxes for 1 day.', wage: 55, location: 'Okhla, New Delhi, DL' },
    { title: 'Event Setup Crew', description: 'Help set up small exhibition stalls.', wage: 80, location: 'Park Street, Kolkata, WB' },
    { title: 'Cleaning Service', description: 'Deep clean kitchen and two bathrooms.', wage: 50, location: 'Andheri West, Mumbai, MH' },
    { title: 'Basic Electrical Work', description: 'Replace switches and fix a ceiling light.', wage: 40, location: 'Velachery, Chennai, TN' },
    { title: 'Office Errand Runner', description: 'Deliver documents across 3 locations.', wage: 35, location: 'Connaught Place, New Delhi, DL' },
    { title: 'Car Wash and Polish', description: 'Wash and exterior detailing for 2 cars.', wage: 30, location: 'Kothrud, Pune, MH' },
    { title: 'Plumbing Assistance', description: 'Fix a leaking tap and inspect pipes.', wage: 50, location: 'Whitefield, Bengaluru, KA' },
    { title: 'Roof Repair Helper', description: 'Assist roofer with minor fixes.', wage: 65, location: 'Madhapur, Hyderabad, TS' },
    { title: 'Store Inventory Count', description: 'Count items and update spreadsheet.', wage: 45, location: 'T Nagar, Chennai, TN' },
    { title: 'Courier Pickup/Drop', description: 'Pickup parcel and deliver within city.', wage: 25, location: 'Bandra, Mumbai, MH' },
    { title: 'Gardening - New Plants', description: 'Plant saplings and setup drip.', wage: 70, location: 'Aundh, Pune, MH' },
    { title: 'Home Shifting Helper', description: 'Help pack and move boxes.', wage: 90, location: 'Koramangala, Bengaluru, KA' },
    { title: 'Wedding Hall Cleanup', description: 'Post-event cleanup for 6 hours.', wage: 85, location: 'Nungambakkam, Chennai, TN' },
    { title: 'Small Painting Touch-ups', description: 'Patch paint in living room.', wage: 35, location: 'Jubilee Hills, Hyderabad, TS' },
    { title: 'AC Filter Cleaning', description: 'Clean two AC filters and service.', wage: 55, location: 'Powai, Mumbai, MH' },
    { title: 'Kitchen Exhaust Cleaning', description: 'Degrease and clean exhaust hood.', wage: 50, location: 'Salt Lake, Kolkata, WB' }
  ];

  // Assign each job to a poster and set status / appliedBy mixture
  const jobsToCreate = jobTemplates.map((jt, idx) => {
    const postedBy = posters[idx % posters.length]._id;
    let status = 'open';
    let appliedBy = undefined;

    // Rough distribution: first 7 open, next 7 active (with worker), last 6 completed (with worker)
    if (idx >= 7 && idx < 14) {
      status = 'active';
      appliedBy = workers[idx % workers.length]._id;
    } else if (idx >= 14) {
      status = 'completed';
      appliedBy = workers[idx % workers.length]._id;
    }

    const deadline = daysFromNow(3 + (idx % 10));

    return { ...jt, postedBy, status, appliedBy, deadline };
  });

  const jobs = await Job.insertMany(jobsToCreate, { ordered: false });
  console.log(`Inserted/Prepared users: ${userDocs.length}, jobs: ${jobs.length}`);

  // Notifications for some active/completed jobs
  const notifications = [];
  for (const j of jobs) {
    if (j.status === 'active') {
      notifications.push({
        type: 'job_assigned',
        message: `You have been assigned to job: ${j.title}`,
        recipientId: j.appliedBy
      });
    }
    if (j.status === 'completed') {
      notifications.push({
        type: 'job_completed',
        message: `Job completed: ${j.title}. Please review payment.`,
        recipientId: j.postedBy
      });
    }
  }
  if (notifications.length) {
    await Notification.insertMany(notifications, { ordered: false });
    console.log(`Inserted notifications: ${notifications.length}`);
  }

  console.log('Seeding complete. Default credentials for all users:');
  console.log('  email: <name>@example.com, password: Password123!');
}

(async () => {
  try {
    await connect();
    await seed();
  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
