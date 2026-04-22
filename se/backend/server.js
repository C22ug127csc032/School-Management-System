import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

import express  from 'express';
import mongoose from 'mongoose';
import cors     from 'cors';
import dotenv   from 'dotenv';
import path     from 'path';
import { fileURLToPath } from 'url';
import Period from './models/Period.model.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ────────────────────────────────────────────────────────────────────
import authRoutes from './routes/auth.routes.js';
import portalRoutes from './routes/portal.routes.js';
import {
  classRoutes, subjectRoutes, teacherRoutes, staffRoutes, studentRoutes,
  classSubjectRoutes, periodRoutes, timetableRoutes, substitutionRoutes,
  attendanceRoutes, feesRoutes, leaveRoutes, outpassRoutes,
  circularRoutes, homeworkRoutes, examRoutes, libraryRoutes,
  inventoryRoutes, expenseRoutes, dashboardRoutes, settingsRoutes,
} from './routes/index.js';

app.use('/api/auth',          authRoutes);
app.use('/api/portal',        portalRoutes);
app.use('/api/classes',       classRoutes);
app.use('/api/subjects',      subjectRoutes);
app.use('/api/teachers',      teacherRoutes);
app.use('/api/staff',         staffRoutes);
app.use('/api/students',      studentRoutes);
app.use('/api/class-subjects',classSubjectRoutes);
app.use('/api/periods',       periodRoutes);
app.use('/api/timetable',     timetableRoutes);
app.use('/api/substitutions', substitutionRoutes);
app.use('/api/attendance',    attendanceRoutes);
app.use('/api/fees',          feesRoutes);
app.use('/api/leave',         leaveRoutes);
app.use('/api/outpass',       outpassRoutes);
app.use('/api/circulars',     circularRoutes);
app.use('/api/homework',      homeworkRoutes);
app.use('/api/exams',         examRoutes);
app.use('/api/library',       libraryRoutes);
app.use('/api/inventory',     inventoryRoutes);
app.use('/api/expenses',      expenseRoutes);
app.use('/api/dashboard',     dashboardRoutes);
app.use('/api/settings',      settingsRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'OK', time: new Date() }));

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal Server Error' });
});

// ── DB + Server ───────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    return Period.syncIndexes();
  })
  .then(() => {
    app.listen(process.env.PORT || 5000, () =>
      console.log(`Server running on port ${process.env.PORT || 5000}`)
    );
  })
  .catch(err => { console.error('DB Error:', err); process.exit(1); });

export default app;
