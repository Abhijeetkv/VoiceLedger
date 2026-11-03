import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'voiceledger_super_secret_jwt_key_2026';

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required').default(''),
});

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

function generateToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * POST /api/auth/signup
 */
router.post('/signup', async (req, res, next) => {
  try {
    const { email, password, name } = signupSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name: name.trim(),
      },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      token,
      user,
      message: 'Account created successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      message: 'Logged in successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/demo
 * 1-Click login or creation of the demo account.
 */
router.post('/demo', async (_req, res, next) => {
  try {
    const demoEmail = 'demo@voiceledger.app';

    let user = await prisma.user.findUnique({
      where: { email: demoEmail },
    });

    if (!user) {
      const hashedPassword = await bcrypt.hash('V0iceLedg3r#Demo2026', 10);
      user = await prisma.user.create({
        data: {
          email: demoEmail,
          password: hashedPassword,
          name: 'Demo User',
        },
      });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      message: 'Logged in as Demo User',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', requireAuth, async (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

export default router;

