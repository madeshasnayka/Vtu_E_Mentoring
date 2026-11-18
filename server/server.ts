import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import app from './src/app';
import User from './src/models/User.model';
import Student from './src/models/Student.model';
import SystemConfig from './src/models/SystemConfig.model';
import { DiagnosticService } from './src/services/diagnostic.service';

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/oms_db';

const seedInitialDatabase = async () => {
  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    // 1. Seed Master Admin
    const adminExists = await User.findOne({ identifier: 'ADMIN-01' });
    if (!adminExists) {
      await User.create({
        identifier: 'ADMIN-01',
        name: 'Dept Administrator',
        email: 'admin@vtu.ac.in',
        passwordHash,
        role: 'admin',
        designation: 'Master Admin',
        isApproved: true,
      });
      console.log('[Seed] Created Admin: ADMIN-01');
    }

    // 2. Seed Default Mentor
    const mentorExists = await User.findOne({ identifier: '0001' });
    if (!mentorExists) {
      await User.create({
        identifier: '0001',
        name: 'Dr. Kumar P K',
        email: 'kumar.pk@vtu.ac.in',
        passwordHash,
        role: 'mentor',
        designation: 'Associate Professor',
        isApproved: true,
      });
      console.log('[Seed] Created Mentor: 0001');
    }

    // 3. Seed Default Student (Sebastian)
    const studentUserExists = await User.findOne({ identifier: '91325' });
    if (!studentUserExists) {
      const studentUser = await User.create({
        identifier: '91325',
        name: 'M Sebastian',
        email: 'sebastian@vtu.ac.in',
        passwordHash,
        role: 'student',
        isApproved: true,
      });

      const newStudent = new Student({
        user: studentUser._id,
        usn: '91325',
        name: 'M Sebastian',
        mentorId: '0001',
        remarks: 'Attendance critical. Needs to clear backlogs.',
        history: [
          { term: 'IA-1', marks: 6.2, attendance: 7.8 },
          { term: 'IA-2', marks: 5.0, attendance: 5.0 },
        ],
      });
      await DiagnosticService.evaluateStudent(newStudent);
      await newStudent.save();
      console.log('[Seed] Created Student: 91325 (M Sebastian)');
    }

    // 4. Seed Diagnostic Config
    const configExists = await SystemConfig.findOne();
    if (!configExists) {
      await SystemConfig.create({
        thetaM: 5.0,
        thetaA: 7.5,
        wM: 0.6,
        wA: 0.4,
        dropDelta: -1.5,
      });
      console.log('[Seed] Initialized System Thresholds');
    }
  } catch (err: any) {
    console.warn('[Seed Error]', err.message);
  }
};

const startServer = async () => {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(MONGO_URI);
    console.log('[MongoDB] Connected successfully');

    await seedInitialDatabase();

    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`[Express] Server running on port ${PORT}`);
    });
  } catch (error: any) {
    console.error('[MongoDB Error]', error.message);
    process.exit(1);
  }
};

startServer();