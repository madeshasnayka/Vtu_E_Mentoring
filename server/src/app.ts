import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

// Route imports
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import mentorRoutes from './routes/mentor.routes';
import studentRoutes from './routes/student.routes';

const app = express();

// 1. Permissive CORS for local device testing
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 2. Request body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Live Request Logger (Shows requests arriving from your phone)
app.use((req, _res, next) => {
  console.log(`[API INCOMING] ${req.method} ${req.url}`);
  next();
});

// 4. API Endpoints
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/mentor', mentorRoutes);
app.use('/api/v1/student', studentRoutes);

// 5. Health Check
app.get('/api/health', (_req, res) => {
  const dbState = mongoose.connection.readyState;
  res.json({
    status: dbState === 1 ? 'healthy' : 'database_unavailable',
    database: dbState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    architecture: 'Online Mentoring System REST API (MERN)',
  });
});

export default app;