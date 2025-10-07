import bcrypt from 'bcrypt';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import type { Express, RequestHandler } from 'express';
import { storage } from './storage';
import type { AuthUser, User } from '@shared/schema';

const SALT_ROUNDS = 10;

// Password hashing utilities
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Sanitize user object - remove sensitive fields
export function sanitizeUser(user: User): AuthUser {
  const { passwordHash, ...safeUser } = user;
  return safeUser as AuthUser;
}

// Session configuration
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: 'sessions',
  });
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

// Authentication setup
export function setupAuth(app: Express) {
  app.set('trust proxy', 1);
  app.use(getSession());

  // Signup endpoint
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters' });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: 'User with this email already exists' });
      }

      // Hash password and create user
      const passwordHash = await hashPassword(password);
      const userId = await storage.createUser({
        email,
        passwordHash,
        firstName,
        lastName,
      });

      // Set session
      (req.session as any).userId = userId;

      // Get user and sanitize before sending
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(500).json({ message: 'Failed to create user' });
      }
      res.status(201).json(sanitizeUser(user));
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ message: 'Failed to create account' });
    }
  });

  // Login endpoint
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      // Find user by email
      const userWithPassword = await storage.getUserByEmail(email);
      if (!userWithPassword) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Check if user has a password (not from OIDC migration)
      if (!userWithPassword.passwordHash) {
        return res.status(401).json({ message: 'Please sign up with a password to continue' });
      }

      // Verify password
      const isValid = await verifyPassword(password, userWithPassword.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Set session
      (req.session as any).userId = userWithPassword.id;

      // Get user and sanitize before sending
      const user = await storage.getUser(userWithPassword.id);
      if (!user) {
        return res.status(500).json({ message: 'User not found' });
      }
      res.json(sanitizeUser(user));
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Failed to login' });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ message: 'Failed to logout' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  // Get current user endpoint
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      res.json(sanitizeUser(user));
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  // Update user profile endpoint
  app.patch('/api/auth/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { 
        firstName, 
        lastName, 
        locale, 
        aiProvider,
        educationBoard,
        examTarget,
        currentClass,
        subjects 
      } = req.body;

      // Update user profile
      await storage.updateUser(userId, {
        firstName,
        lastName,
        locale,
        aiProvider,
        educationBoard,
        examTarget,
        currentClass,
        subjects,
        updatedAt: new Date(),
      });

      // Get updated user
      const updatedUser = await storage.getUser(userId);
      res.json(sanitizeUser(updatedUser!));
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  });

  // Complete onboarding endpoint
  app.post('/api/auth/complete-onboarding', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { 
        educationLevel,
        class: userClass,
        board,
        stateBoard,
        stream,
        course,
        yearSemester,
        examGoals,
        subjectPreferences,
        learningStyle,
        primaryGoal,
        whatsappNotifications,
        mobileNumber
      } = req.body;

      // Update user with onboarding data
      await storage.updateUser(userId, {
        onboardingCompleted: true,
        educationLevel,
        class: userClass,
        board,
        stateBoard,
        stream,
        course,
        yearSemester,
        examGoals,
        subjectPreferences,
        learningStyle,
        primaryGoal,
        whatsappNotifications,
        mobileNumber,
        // Also update legacy fields for backward compatibility
        currentClass: userClass ? `Class ${userClass}` : course,
        examTarget: examGoals?.[0] || null,
        subjects: subjectPreferences,
        updatedAt: new Date(),
      });

      // Get updated user
      const updatedUser = await storage.getUser(userId);
      res.json(sanitizeUser(updatedUser!));
    } catch (error) {
      console.error('Error completing onboarding:', error);
      res.status(500).json({ message: 'Failed to complete onboarding' });
    }
  });
}

// Authentication middleware
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const userId = (req.session as any).userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Attach sanitized user to request
    (req as any).user = sanitizeUser(user);
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Unauthorized' });
  }
};
