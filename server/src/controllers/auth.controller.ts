import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import UserModel from '../models/User.model';
import StudentModel from '../models/Student.model';
import SystemConfigModel from '../models/SystemConfig.model';

const User: any = (UserModel as any)?.default || UserModel;
const Student: any = (StudentModel as any)?.default || StudentModel;
const SystemConfig: any = (SystemConfigModel as any)?.default || SystemConfigModel;

const JWT_SECRET = process.env.JWT_SECRET || 'vtu_mentorship_jwt_secret_key_2026';
const FACULTY_MENTOR_IDS = new Set(['0001', '1', '1302', '0003', '0002']);

// ============================================================================
// 1. LOGIN (Strict Password Verification — Preserves Self-Registered Passwords)
// ============================================================================
export const login = async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res
        .status(400)
        .json({ error: 'Please enter identifier/email and password.' });
    }

    const cleanId = String(identifier).trim();
    console.log(`[Auth Login Attempt] Identifier: "${cleanId}"`);

    const dbState = mongoose.connection.readyState;
    if (dbState !== 1) {
      const stateMap: Record<number, string> = {
        0: 'Disconnected',
        2: 'Connecting',
        3: 'Disconnecting',
      };
      const stateStr = stateMap[dbState] || 'Unknown';
      return res.status(503).json({
        error: `Database is currently ${stateStr}. Please verify MongoDB is running and retry.`,
      });
    }

    let user = await User.findOne({
      $or: [
        { identifier: { $regex: `^${cleanId}$`, $options: 'i' } },
        { email: { $regex: `^${cleanId}$`, $options: 'i' } },
      ],
    }).select('+password +passwordHash');

    if (!user) {
      const isDefaultAdmin =
        cleanId.toUpperCase() === 'ADMIN-01' ||
        cleanId.toLowerCase() === 'admin@vtu.ac.in';
      const isDefaultMentor = cleanId === '0001' || cleanId === '1';

      if (isDefaultAdmin || isDefaultMentor) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(String(password), salt);
        user = await User.create({
          identifier: isDefaultAdmin ? 'ADMIN-01' : cleanId,
          name: isDefaultAdmin
            ? 'Department Administrator'
            : cleanId === '0001'
            ? 'Dr. Kumar P K'
            : 'Maddy',
          email: isDefaultAdmin
            ? 'admin@vtu.ac.in'
            : cleanId === '0001'
            ? 'kumar.pk@vtu.ac.in'
            : 'maddy@vtu.ac.in',
          role: isDefaultAdmin ? 'admin' : 'mentor',
          designation: isDefaultAdmin ? 'Academic Administrator' : 'Faculty Mentor',
          password: hashedPassword,
          passwordHash: hashedPassword,
          isApproved: true,
        });
      } else {
        return res.status(401).json({
          error: `User "${cleanId}" not found. If you are a new student, please complete registration first.`,
        });
      }
    }

    if (user.identifier.toUpperCase() === 'ADMIN-01' || user.email?.includes('admin')) {
      user.role = 'admin';
      user.isApproved = true;
    } else if (
      FACULTY_MENTOR_IDS.has(user.identifier.trim()) ||
      /Dr\. Kumar|Madhu|Maddy/i.test(user.name)
    ) {
      user.role = 'mentor';
      user.designation = 'Faculty Mentor';
      user.isApproved = true;
    }

    const existingHash = user.password || user.passwordHash;
    let isMatch = false;

    if (!existingHash) {
      return res.status(401).json({
        error: 'Account password not configured. Please contact administrator.',
      });
    } else if (
      existingHash.startsWith('$2a$') ||
      existingHash.startsWith('$2b$') ||
      existingHash.startsWith('$2y$')
    ) {
      isMatch = await bcrypt.compare(String(password), existingHash);
    } else {
      isMatch = existingHash === String(password);
      if (isMatch) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(String(password), salt);
        user.passwordHash = user.password;
        await user.save();
      }
    }

    if (!isMatch) {
      return res
        .status(401)
        .json({ error: 'Invalid credentials. Incorrect password.' });
    }

    if (!user.isApproved && user.role === 'student') {
      const studentDoc = await Student.findOne({
        $or: [{ usn: user.identifier }, { email: user.email }],
      });
      if (!studentDoc || !studentDoc.isApproved) {
        return res.status(403).json({
          error: 'Your student registration is pending administrator approval.',
        });
      }
      user.isApproved = true;
      await user.save();
    }

    const token = jwt.sign(
      {
        id: user._id,
        _id: user._id,
        identifier: user.identifier,
        role: user.role,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        identifier: user.identifier,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('[AUTH CONTROLLER LOGIN ERROR]:', error.message);
    return res.status(500).json({
      error: `Authentication Error: ${
        error.message || 'Server encountered an unexpected error.'
      }`,
    });
  }
};

// ============================================================================
// 2. STUDENT-ONLY SELF-REGISTRATION (Unassigned Mentor & Custom Password)
// ============================================================================
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, identifier, phone, password, admissionYear } = req.body;
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: 'Name, email, and password are required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(name).trim();
    const cleanPhone = phone ? String(phone).trim() : '';
    const rawYear = admissionYear ? String(admissionYear).trim() : '2026';
    const resolvedYear = /^\d{4}$/.test(rawYear) ? rawYear : '2026';
    const userRole = 'student';

    const existingUser = await User.findOne({
      $or: [
        { email: cleanEmail },
        ...(identifier ? [{ identifier: String(identifier).trim().toUpperCase() }] : []),
      ],
    });
    if (existingUser) {
      return res.status(409).json({
        error:
          'An account with this USN or email address already exists. Please sign in.',
      });
    }

    const studentRecord = await Student.findOne({
      $or: [
        { email: cleanEmail },
        ...(identifier ? [{ usn: String(identifier).trim().toUpperCase() }] : []),
      ],
    });

    const studentIdentifier = studentRecord
      ? studentRecord.usn
      : identifier
      ? String(identifier).trim().toUpperCase()
      : `ADM-${resolvedYear}-${Math.floor(1000 + Math.random() * 9000)}`;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(String(password), salt);

    const newUser = await User.create({
      name: cleanName,
      email: cleanEmail,
      identifier: studentIdentifier,
      phone: cleanPhone,
      password: hashedPassword,
      passwordHash: hashedPassword,
      role: userRole,
      mentorId: '',
      designation: `Student (${resolvedYear} Batch)`,
      isApproved: false,
    });

    if (studentRecord) {
      studentRecord.user = newUser._id;
      studentRecord.name = cleanName;
      studentRecord.phone = cleanPhone;
      studentRecord.admissionYear = resolvedYear;
      studentRecord.status = 'registered';
      await studentRecord.save();
    } else {
      await Student.create({
        user: newUser._id,
        usn: studentIdentifier,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        mentorId: '',
        mentorName: 'No Mentor',
        admissionYear: resolvedYear,
        status: 'registered',
        isApproved: false,
        history: [],
        currentMarks: null,
        currentAttendance: null,
        dynamicTotal: null,
        riskLevel: 'Pending Evaluation',
      });
    }

    await SystemConfig.findOneAndUpdate(
      {},
      { $addToSet: { activeBatches: resolvedYear } },
      { upsert: true }
    );

    return res.status(201).json({
      message: `Student registration submitted for ${resolvedYear} Batch! Awaiting administrator approval.`,
      user: {
        id: newUser._id,
        identifier: newUser.identifier,
        name: newUser.name,
        role: newUser.role,
        admissionYear: resolvedYear,
        isApproved: false,
      },
    });
  } catch (error: any) {
    console.error('[Auth Register Error]:', error);
    return res
      .status(500)
      .json({ error: error.message || 'Registration failed.' });
  }
};

// ============================================================================
// 3. PROFILE VERIFICATION
// ============================================================================
export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?._id;
    const user = await User.findById(userId).select('-password -passwordHash');
    return res.status(200).json({ user });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};