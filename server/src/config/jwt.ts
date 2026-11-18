// server/src/config/jwt.ts
import dotenv from 'dotenv';
dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET || 'vtu_mentorship_jwt_secret_key_2026';