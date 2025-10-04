  import express from 'express';
  import mongoose from 'mongoose';
  import dotenv from 'dotenv';
  import cors from 'cors';
  import morgan from 'morgan';
  import cookieParser from 'cookie-parser';
  import path from 'path';
  import multer from 'multer';
  import fs from 'fs';
  import { body, validationResult } from 'express-validator';
  import bcrypt from 'bcryptjs';
  import jwt from 'jsonwebtoken';
  import nodemailer from 'nodemailer';
  import { adminAuth, superAdminAuth } from './middleware/adminAuth.js';
  import { v2 as cloudinary } from 'cloudinary';
  import { CloudinaryStorage } from 'multer-storage-cloudinary';


  dotenv.config();

  const app = express();

  // Middleware
 const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
  'http://192.168.0.105:5173',
  'http://192.168.0.105:4173',
  'https://vinnu-app.vercel.app',  // ✅ Without slash
  'https://vinnu-app.vercel.app/'  // ✅ With slash
];


  app.use(cors({
    origin: function(origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log('❌ Origin not allowed:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }));

  app.use(express.json());
  app.use(cookieParser());
  app.use(morgan('dev'));

  // Uploads setup
  const UPLOAD_DIR = path.resolve('uploads');
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  //app.use('/uploads', express.static(UPLOAD_DIR));

  // MongoDB
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vinnu';

  const PORT = process.env.PORT || 5000;
  const HOST = process.env.HOST || '0.0.0.0';

  async function connectToDatabase() {
    try {
      await mongoose.connect(MONGO_URI);
      console.log('✅ Connected to MongoDB');
      
      // Auto-verify old users (before email verification was added)
      const result = await User.updateMany(
        { isVerified: { $ne: true } },
        { $set: { isVerified: true, verificationOTP: null, otpExpiry: null } }
      );
      if (result.modifiedCount > 0) {
        console.log(`✅ Auto-verified ${result.modifiedCount} existing users`);
      }
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      process.exit(1);
    }
  }


 const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  bio: { type: String, default: '' },
  avatarUrl: String,
  socialProfiles: {
    spotify: String,
    appleMusic: String,
    youtube: String
  },
  
  // ✅ ADD THESE FIELDS
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequestsSent: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequestsReceived: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  role: { 
    type: String, 
    enum: ['user', 'admin', 'moderator', 'superadmin'], 
    default: 'user' 
  },
  isBanned: { type: Boolean, default: false },
  bannedReason: String,
  
  isVerified: { type: Boolean, default: false },
  verificationOTP: String,
  otpExpiry: Date
}, { timestamps: true });



  // THIS LINE IS CRITICAL - DO NOT DELETE!
  const User = mongoose.model('User', userSchema);

  // Playlist Schema stays the same - no changes needed
  const playlistSchema = new mongoose.Schema({
    ownerId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true 
    },
    title: { 
      type: String, 
      required: true, 
      trim: true 
    },
    url: { 
      type: String, 
      required: true 
    },
    provider: { 
      type: String, 
      required: true, 
      trim: true 
    },
    coverUrl: { 
      type: String, 
      required: true 
    },
    genre: [{ 
      type: String 
    }],
    tags: [{
      text: { type: String, required: true },
      color: { type: String, default: '#e0e7ff' }
    }],
    likes: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    }],
    views: { 
      type: Number, 
      default: 0 
    },
    clicks: { 
      type: Number, 
      default: 0 
    }
  }, { timestamps: true });

  // THIS LINE IS CRITICAL - DO NOT DELETE!
  const Playlist = mongoose.model('Playlist', playlistSchema);
  // Real Gmail email setup
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  // Test email connection on startup
  transporter.verify(function (error, success) {
    if (error) {
      console.error('❌ Email setup failed:', error);
    } else {
      console.log('✅ Email server is ready to send messages');
    }
  });

  // Generate random 6-digit OTP
  function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send OTP email
  async function sendOTPEmail(email, otp, firstName) {
    const mailOptions = {
      from: `"Vinnu" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify your Vinnu account - OTP Code',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="border: 2px solid #000; padding: 30px; text-align: center;">
            <h1 style="color: #000; font-size: 28px; margin: 0 0 20px 0;">Welcome to Vinnu! 🎵</h1>
            <p style="font-size: 16px; color: #333; margin: 0 0 30px 0;">
              Hi <strong>${firstName}</strong>, verify your email to complete registration.
            </p>
            <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <p style="font-size: 14px; color: #666; margin: 0 0 10px 0;">Your verification code:</p>
              <div style="font-size: 36px; font-weight: 700; color: #000; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                ${otp}
              </div>
            </div>
            <p style="font-size: 14px; color: #666; margin: 20px 0 0 0;">
              ⏰ This code expires in <strong>10 minutes</strong>.
            </p>
          </div>
          <p style="font-size: 12px; color: #999; margin-top: 24px; text-align: center;">
            If you didn't create an account, please ignore this email.<br/>
            This is an automated message from Vinnu.
          </p>
        </div>
      `,
      text: `Welcome to Vinnu!\n\nHi ${firstName},\n\nYour verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't create an account, please ignore this email.`
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ OTP email sent to:', email);
      console.log('📧 Message ID:', info.messageId);
      console.log('🔑 OTP Code:', otp);
      return true;
    } catch (error) {
      console.error('❌ Failed to send OTP email:', error);
      return false;
    }
  }



  // --- Auth Helpers ---
  const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
  const JWT_EXPIRES_IN = '7d';

function authMiddleware(req, res, next) {
  console.log('🔐 Auth middleware - Cookies:', req.cookies);
  console.log('🔐 Auth middleware - Headers:', req.headers.authorization);
  
  // Try to get token from Authorization header first
  let token = req.headers.authorization?.replace('Bearer ', '');
  
  // If not in header, try cookies as fallback
  if (!token) {
    token = req.cookies?.token;
  }
  
  if (!token) {
    console.log('❌ No token found');
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    console.log('✅ Token verified for user:', req.userId);
    
    // Fetch user and attach to request
    User.findById(req.userId).then(user => {
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      req.user = user;
      next();
    }).catch(err => {
      console.error('❌ Error fetching user:', err);
      return res.status(401).json({ message: 'Unauthorized' });
    });
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
    return res.status(401).json({ message: 'Unauthorized' });
  }
}



  function setAuthCookie(req, res, token) {
    console.log('🍪 Setting auth cookie...');
    console.log('🍪 Request origin:', req.get('origin'));
    console.log('🍪 Request host:', req.get('host'));
    
    const cookieOptions = {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    };
    
    // Only set domain for localhost
    const host = req.get('host');
    if (host && host.startsWith('localhost')) {
      cookieOptions.domain = 'localhost';
    }
    // For IP addresses, don't set domain at all
    
    res.cookie('token', token, cookieOptions);
    console.log('✅ Cookie set with options:', cookieOptions);
  }




  // --- Multer ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'vinnu',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 1500, height: 1500, crop: 'limit' }]
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});
  // ------------------------- ROUTES -------------------------
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));



  // --- Auth Routes ---
 // --- Auth Routes ---
// Register - Send OTP
app.post('/api/auth/register', [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    return res.status(400).json({ 
      message: firstError.msg,
      field: firstError.path 
    });
  }

  const { firstName, lastName, username, email, password } = req.body;

  try {
    console.log('📝 Registration attempt for:', username);

    // Check if username already exists
    const existingUsername = await User.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      return res.status(400).json({ 
        message: 'Username already taken',
        field: 'username' 
      });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ 
        message: 'Email already registered',
        field: 'email' 
      });
    }

    // Generate OTP and hash password
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create unverified user
    const user = new User({
      firstName,
      lastName,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password: hashedPassword,  // ✅ FIXED: use "password" field
      avatarUrl: '',
      bio: '',
      isVerified: false,
      verificationOTP: otp,
      otpExpiry
    });

    await user.save();

    // Send OTP email
    // Send OTP email (optional for deployment)
try {
  const emailSent = await sendOTPEmail(email, otp, firstName);
  if (emailSent) {
    console.log('✅ OTP email sent successfully');
  }
} catch (emailError) {
  console.error('⚠️ Email failed but continuing registration:', emailError);
}

// Auto-verify user for now (temporary fix for deployment)
user.isVerified = true;
user.verificationOTP = null;
user.otpExpiry = null;
await user.save();


    console.log('✅ User created (unverified):', username);
    console.log('📧 OTP sent:', otp);

    / Auto-verify user for now (temporary fix for deployment)
user.isVerified = true;
user.verificationOTP = null;
user.otpExpiry = null;
await user.save();


    console.log('✅ User created (unverified):', username);
    console.log('📧 OTP sent:', otp);

    return res.status(200).json({
      message: 'OTP sent to your email',
      email: email,
      needsVerification: true
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
        field: field 
      });

  } catch (error) {
    console.error('❌ Registration error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
        field: field 
      });
    }

    return res.status(500).json({ message: 'Internal server error' });
  }
});

  // Send friend request notification email
  async function sendFriendRequestEmail(recipientEmail, senderName, senderUsername, recipientName) {
    const mailOptions = {
      from: `"Vinnu" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: `${senderName} sent you a friend request on Vinnu`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="border: 2px solid #000; padding: 30px; text-align: center;">
            <h1 style="color: #000; font-size: 28px; margin: 0 0 20px 0;">👥 Friend Request</h1>
            <p style="font-size: 16px; color: #333; margin: 0 0 30px 0;">
              Hi <strong>${recipientName}</strong>,
            </p>
            <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <p style="font-size: 18px; color: #000; margin: 0;">
                <strong>${senderName}</strong> (@${senderUsername})
              </p>
              <p style="font-size: 14px; color: #666; margin: 10px 0 0 0;">
                wants to be your friend on Vinnu!
              </p>
            </div>
            <p style="font-size: 14px; color: #666; margin: 20px 0;">
              Log in to accept or decline this request.
            </p>
            <a href="http://localhost:5173/friends" 
              style="display: inline-block; padding: 12px 32px; background: #000; color: #fff; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: 10px; border-radius: 4px;">
              View Request
            </a>
          </div>
          <p style="font-size: 12px; color: #999; margin-top: 24px; text-align: center;">
            This is an automated message from Vinnu.<br/>
            You can manage your notifications in settings.
          </p>
        </div>
      `,
      text: `Hi ${recipientName},\n\n${senderName} (@${senderUsername}) wants to be your friend on Vinnu!\n\nLog in to accept or decline this request.\n\nThis is an automated message from Vinnu.`
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Friend request email sent to:', recipientEmail);
      console.log('📧 Message ID:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Failed to send friend request email:', error);
      return false;
    }
  }


  // Verify OTP
  app.post('/api/auth/verify-otp', async (req, res) => {
    try {
      const { email, otp } = req.body;

      console.log('🔐 OTP verification attempt:', { email, otp });

      if (!email || !otp) {
        return res.status(400).json({ message: 'Email and OTP required' });
      }

      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (user.isVerified) {
        return res.status(400).json({ message: 'Account already verified' });
      }

      // Check OTP expiry
      if (user.otpExpiry < new Date()) {
        return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
      }

      // Verify OTP
      if (user.verificationOTP !== otp) {
        return res.status(400).json({ message: 'Invalid OTP' });
      }

      // Mark user as verified
      user.isVerified = true;
      user.verificationOTP = null;
      user.otpExpiry = null;
      await user.save();

      console.log('✅ User verified:', user.username);

      res.status(200).json({
        message: 'Email verified successfully! You can now log in.',
        username: user.username
      });

    } catch (error) {
      console.error('❌ OTP verification error:', error);
      res.status(500).json({ message: 'Verification failed' });
    }
  });

  // Resend OTP
  app.post('/api/auth/resend-otp', async (req, res) => {
    try {
      const { email } = req.body;

      console.log('🔄 Resend OTP request:', email);

      if (!email) {
        return res.status(400).json({ message: 'Email required' });
      }

      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (user.isVerified) {
        return res.status(400).json({ message: 'Account already verified' });
      }

      // Generate new OTP
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

      user.verificationOTP = otp;
      user.otpExpiry = otpExpiry;
      await user.save();

      // Send OTP email
      const emailSent = await sendOTPEmail(email, otp, user.firstName);

      if (!emailSent) {
        return res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
      }

      console.log('✅ OTP resent:', otp);

      res.status(200).json({ message: 'OTP sent to your email' });

    } catch (error) {
      console.error('❌ Resend OTP error:', error);
      res.status(500).json({ message: 'Failed to resend OTP' });
    }
  });


  // Login route - supports email OR username
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      console.log('🔐 Login attempt:', email);
      
      // Find user by email OR username
      const user = await User.findOne({
        $or: [
          { email: email?.toLowerCase() },
          { username: email?.toLowerCase() }  // Also check username
        ]
      });
      
      if (!user) {
        console.log('❌ User not found:', email);
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Check if password exists
      if (!user.password) {
        console.log('❌ User has no password:', email);
        return res.status(500).json({ message: 'Account error. Please contact support.' });
      }
      
      // Verify password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        console.log('❌ Invalid password for:', email);
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Check if banned
      if (user.isBanned) {
        return res.status(403).json({ 
          message: `Account banned. Reason: ${user.bannedReason || 'Terms violation'}` 
        });
      }
      
      // Generate token
      const token = jwt.sign({ sub: user._id }, JWT_SECRET, { expiresIn: '7d' });
      
      console.log('✅ Login successful:', user.email);
      
      res.json({
        token,
        user: {
          _id: user._id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role || 'user'
        }
      });
    } catch (error) {
      console.error('❌ Login error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });



  // Logout
  app.post('/api/auth/logout', (_req, res) => {
    res.clearCookie('token', { path: '/' });
    console.log('✅ User logged out');
    return res.json({ ok: true });
  });

  // Me
  app.get('/api/auth/me', authMiddleware, async (req, res) => {
    try {
      const user = await User.findById(req.userId).select('_id firstName lastName username email avatarUrl bio');
      if (!user) {
        console.log('❌ User not found:', req.userId);
        return res.status(404).json({ message: 'Not found' });
      }
      console.log('✅ User info retrieved:', user.username);
      return res.json(user);
    } catch (e) {
      console.error('❌ /me error:', e);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

app.get('/api/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select('-password')
      .populate('friendRequestsReceived', 'username firstName lastName avatarUrl')
      .populate('friendRequestsSent', 'username firstName lastName avatarUrl')
      .populate('friends', 'username firstName lastName avatarUrl')
      .populate('followers', 'username firstName lastName avatarUrl')
      .populate('following', 'username firstName lastName avatarUrl');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('❌ Profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});




  app.patch('/api/profile', authMiddleware, [
    body('firstName').optional().isString().trim().notEmpty(),
    body('lastName').optional().isString().trim().notEmpty(),
    body('username').optional().isString().trim().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/),
    body('bio').optional().isString().trim().isLength({ max: 160 })
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { firstName, lastName, username, bio } = req.body;
    try {
      if (username) {
        const exists = await User.findOne({ username: username.toLowerCase(), _id: { $ne: req.userId } });
        if (exists) return res.status(409).json({ message: 'username already in use', field: 'username' });
      }
      
      const updateData = {};
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (username) updateData.username = username.toLowerCase();
      if (bio !== undefined) updateData.bio = bio;

      const updated = await User.findByIdAndUpdate(req.userId, updateData, { new: true })
        .select('_id firstName lastName username email avatarUrl bio');
      
      console.log('✅ Profile updated:', updated.username);
      return res.json(updated);
    } catch (e) {
      console.error('❌ Profile update error:', e);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/profile/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    
    const url = `/uploads/${req.file.filename}`;
    const updated = await User.findByIdAndUpdate(req.userId, { avatarUrl: url }, { new: true })
      .select('_id firstName lastName username email avatarUrl bio');
    
    console.log('✅ Avatar updated:', updated.username);
    return res.json(updated);
  });

  // --- Playlist Routes ---
 app.post('/api/playlists/cover-upload', authMiddleware, upload.single('cover'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
  
  // ✅ Cloudinary returns the full URL in req.file.path
  console.log('✅ Cover uploaded:', req.file.path);
  return res.status(201).json({ url: req.file.path });
});


  // Create playlist
  app.post('/api/playlists/create', authMiddleware, [
    body('title').isString().trim().notEmpty(),
    body('url').isURL(),
    body('provider').isString().trim().notEmpty(),
    body('coverUrl').isString().trim().notEmpty(),
    body('genre').isArray(),
    body('tags').isArray()
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { title, url, provider, coverUrl, genre, tags } = req.body;
      const playlist = await Playlist.create({ 
        ownerId: req.userId, 
        title, 
        url, 
        provider, 
        coverUrl, 
        genre, 
        tags 
      });
      const populatedPlaylist = await Playlist.findById(playlist._id)
        .populate('ownerId', 'username avatarUrl');
      
      console.log('✅ Playlist created:', playlist._id);
      return res.status(201).json(populatedPlaylist);
    } catch (e) {
      console.error('❌ Playlist creation error:', e);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Update playlist
  app.patch('/api/playlists/:id', authMiddleware, async (req, res) => {
    try {
      const playlist = await Playlist.findById(req.params.id);
      if (!playlist) return res.status(404).json({ message: 'Playlist not found' });
      if (playlist.ownerId.toString() !== req.userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const updateFields = ['title', 'url', 'provider', 'coverUrl', 'genre', 'tags'];
      updateFields.forEach(field => {
        if (req.body[field] !== undefined) playlist[field] = req.body[field];
      });

      await playlist.save();
      const populated = await Playlist.findById(playlist._id)
        .populate('ownerId', 'username avatarUrl');
      
      console.log('✅ Playlist updated:', playlist._id);
      return res.json(populated);
    } catch (e) {
      console.error('❌ Playlist update error:', e);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Delete playlist
  app.delete('/api/playlists/:id', authMiddleware, async (req, res) => {
    try {
      const playlist = await Playlist.findById(req.params.id);
      if (!playlist) return res.status(404).json({ message: 'Playlist not found' });
      if (playlist.ownerId.toString() !== req.userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      await playlist.deleteOne();
      console.log('✅ Playlist deleted:', req.params.id);
      return res.json({ ok: true });
    } catch (e) {
      console.error('❌ Playlist deletion error:', e);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Like/Unlike playlist
  app.post('/api/playlists/:id/like', authMiddleware, async (req, res) => {
    try {
      console.log('❤️ Like request for playlist:', req.params.id, 'by user:', req.userId);
      
      const playlist = await Playlist.findById(req.params.id);
      if (!playlist) {
        return res.status(404).json({ message: 'Playlist not found' });
      }

      // Initialize likes array if it doesn't exist
      if (!Array.isArray(playlist.likes)) {
        playlist.likes = [];
      }

      const userIdStr = req.userId.toString();
      const likeIndex = playlist.likes.indexOf(userIdStr);

      if (likeIndex > -1) {
        // Unlike: remove user from likes
        playlist.likes.splice(likeIndex, 1);
        console.log('💔 User unliked playlist');
      } else {
        // Like: add user to likes
        playlist.likes.push(userIdStr);
        console.log('❤️ User liked playlist');
      }

      await playlist.save();

      // Return updated playlist with populated owner
      const updatedPlaylist = await Playlist.findById(playlist._id)
        .populate('ownerId', 'username avatarUrl');

      console.log('✅ Playlist likes updated. Total likes:', updatedPlaylist.likes.length);
      return res.json(updatedPlaylist);
    } catch (error) {
      console.error('❌ Like playlist error:', error);
      return res.status(500).json({ message: 'Failed to like playlist' });
    }
  });

  // ==================== FRIEND SYSTEM ROUTES ====================

app.post('/api/users/:username/friend-request', authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    const targetUser = await User.findOne({ username: req.params.username.toLowerCase() });
    
    if (!targetUser) {
      console.log('❌ Target user not found:', req.params.username);
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (targetUser._id.equals(currentUser._id)) {
      console.log('❌ Trying to friend self');
      return res.status(400).json({ message: 'Cannot send friend request to yourself' });
    }
    
    // ✅ Initialize arrays if missing
    if (!currentUser.friends) currentUser.friends = [];
    if (!targetUser.friends) targetUser.friends = [];
    if (!currentUser.friendRequestsSent) currentUser.friendRequestsSent = [];
    if (!currentUser.friendRequestsReceived) currentUser.friendRequestsReceived = [];
    if (!targetUser.friendRequestsSent) targetUser.friendRequestsSent = [];
    if (!targetUser.friendRequestsReceived) targetUser.friendRequestsReceived = [];
    
    // Check if already friends
    if (currentUser.friends.some(id => id.equals(targetUser._id))) {
      console.log('❌ Already friends:', currentUser.username, '<->', targetUser.username);
      return res.status(400).json({ message: 'Already friends' });
    }
    
    // Check if request already sent
    if (currentUser.friendRequestsSent.some(id => id.equals(targetUser._id))) {
      console.log('❌ Request already sent:', currentUser.username, '->', targetUser.username);
      return res.status(400).json({ message: 'Friend request already sent' });
    }
    
    // Check if they already sent you a request (auto-accept)
    if (currentUser.friendRequestsReceived.some(id => id.equals(targetUser._id))) {
      // Auto-accept
      await User.updateOne(
        { _id: currentUser._id },
        { 
          $addToSet: { friends: targetUser._id },
          $pull: { friendRequestsReceived: targetUser._id }
        }
      );
      
      await User.updateOne(
        { _id: targetUser._id },
        { 
          $addToSet: { friends: currentUser._id },
          $pull: { friendRequestsSent: currentUser._id }
        }
      );
      
      console.log('✅ Auto-accepted mutual friend request');
      return res.json({ 
        message: 'Friend request accepted!',
        status: 'friends'
      });
    }
    
    // Send new friend request
    await User.updateOne(
      { _id: currentUser._id },
      { $addToSet: { friendRequestsSent: targetUser._id } }
    );
    
    await User.updateOne(
      { _id: targetUser._id },
      { $addToSet: { friendRequestsReceived: currentUser._id } }
    );
    
    // Send email notification
    const senderFullName = `${currentUser.firstName} ${currentUser.lastName}`;
    const recipientFullName = `${targetUser.firstName} ${targetUser.lastName}`;
    
    try {
      await sendFriendRequestEmail(
        targetUser.email, 
        senderFullName, 
        currentUser.username,
        recipientFullName
      );
    } catch (emailError) {
      console.log('⚠️ Email failed but friend request sent');
    }
    
    console.log('✅ Friend request sent:', currentUser.username, '->', targetUser.username);
    res.json({ 
      message: 'Friend request sent',
      status: 'pending'
    });
  } catch (error) {
    console.error('❌ Friend request error:', error);
    res.status(500).json({ message: 'Failed to send friend request' });
  }
});




  // Accept friend request
  app.post('/api/users/:username/accept-friend', authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    const requester = await User.findOne({ username: req.params.username.toLowerCase() });
    
    if (!requester) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // ✅ Initialize arrays if missing
    if (!currentUser.friendRequestsReceived) currentUser.friendRequestsReceived = [];
    
    // Check if request exists
    if (!currentUser.friendRequestsReceived.some(id => id.equals(requester._id))) {
      return res.status(400).json({ message: 'No friend request from this user' });
    }
    
    // ✅ Use updateOne instead of .save() to avoid password validation
    await User.updateOne(
      { _id: currentUser._id },
      { 
        $addToSet: { friends: requester._id },
        $pull: { friendRequestsReceived: requester._id }
      }
    );
    
    await User.updateOne(
      { _id: requester._id },
      { 
        $addToSet: { friends: currentUser._id },
        $pull: { friendRequestsSent: currentUser._id }
      }
    );
    
    // 👇 SEND ACCEPTANCE EMAIL 👇
    try {
      const acceptedEmail = {
        from: `"Vinnu" <${process.env.EMAIL_USER}>`,
        to: requester.email,
        subject: `${currentUser.firstName} accepted your friend request!`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="border: 2px solid #000; padding: 30px; text-align: center;">
              <h1 style="color: #000; font-size: 28px; margin: 0 0 20px 0;">🎉 Friend Request Accepted!</h1>
              <p style="font-size: 16px; color: #333; margin: 0 0 30px 0;">
                <strong>${currentUser.firstName} ${currentUser.lastName}</strong> accepted your friend request!
              </p>
              <a href="http://localhost:5173/friends" 
                style="display: inline-block; padding: 12px 32px; background: #000; color: #fff; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 4px;">
                View Friends
              </a>
            </div>
          </div>
        `,
        text: `${currentUser.firstName} ${currentUser.lastName} accepted your friend request!`
      };
      
      await transporter.sendMail(acceptedEmail);
      console.log('✅ Acceptance email sent to:', requester.email);
    } catch (emailError) {
      console.log('⚠️ Email failed but friend request accepted');
    }
    // 👆 END 👆
    
    console.log('✅ Friend request accepted');
    res.json({ 
      message: 'Friend request accepted',
      status: 'friends',
      friendsCount: (currentUser.friends?.length || 0) + 1
    });
  } catch (error) {
    console.error('❌ Accept friend error:', error);
    res.status(500).json({ message: 'Failed to accept friend request' });
  }
});



  // Reject friend request
app.post('/api/users/:username/reject-friend', authMiddleware, async (req, res) => {
  try {
    const targetUser = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!targetUser) return res.status(404).json({ message: 'User not found' });
    
    await User.updateOne({ _id: req.userId }, { $pull: { friendRequestsReceived: targetUser._id } });
    await User.updateOne({ _id: targetUser._id }, { $pull: { friendRequestsSent: req.userId } });
    
    console.log('✅ Friend request rejected');
    res.json({ message: 'Friend request rejected', status: 'none' });
  } catch (error) {
    console.error('❌ Reject friend error:', error);
    res.status(500).json({ message: 'Failed to reject friend request' });
  }
});


  // Cancel friend request (if you sent it)
app.post('/api/users/:username/cancel-friend-request', authMiddleware, async (req, res) => {
  try {
    const targetUser = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    await User.updateOne({ _id: req.userId }, { $pull: { friendRequestsSent: targetUser._id } });
    await User.updateOne({ _id: targetUser._id }, { $pull: { friendRequestsReceived: req.userId } });
    
    console.log('✅ Friend request cancelled');
    res.json({ message: 'Friend request cancelled', status: 'none' });
  } catch (error) {
    console.error('❌ Cancel friend request error:', error);
    res.status(500).json({ message: 'Failed to cancel friend request' });
  }
});


  // Remove friend
app.post('/api/users/:username/remove-friend', authMiddleware, async (req, res) => {
  try {
    const targetUser = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!targetUser) return res.status(404).json({ message: 'User not found' });
    
    await User.updateOne({ _id: req.userId }, { $pull: { friends: targetUser._id } });
    await User.updateOne({ _id: targetUser._id }, { $pull: { friends: req.userId } });
    
    console.log('✅ Friend removed');
    res.json({ message: 'Friend removed', status: 'none' });
  } catch (error) {
    console.error('❌ Remove friend error:', error);
    res.status(500).json({ message: 'Failed to remove friend' });
  }
});

  // Get friend status
app.get('/api/users/:username/friend-status', authMiddleware, async (req, res) => {
  try {
    const targetUser = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentUser = await User.findById(req.userId);
    
    // ✅ Initialize arrays if missing
    if (!currentUser.friends) currentUser.friends = [];
    if (!currentUser.friendRequestsSent) currentUser.friendRequestsSent = [];
    if (!currentUser.friendRequestsReceived) currentUser.friendRequestsReceived = [];
    if (!targetUser.friends) targetUser.friends = [];
    if (!targetUser.friendRequestsSent) targetUser.friendRequestsSent = [];
    if (!targetUser.friendRequestsReceived) targetUser.friendRequestsReceived = [];

    const isFriend = currentUser.friends.some(id => id.equals(targetUser._id));
    const requestSent = currentUser.friendRequestsSent.some(id => id.equals(targetUser._id));
    const requestReceived = currentUser.friendRequestsReceived.some(id => id.equals(targetUser._id));

    res.json({
      isFriend,
      requestSent,
      requestReceived
    });
  } catch (error) {
    console.error('❌ Friend status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

  // Get pending friend requests
  app.get('/api/friend-requests', authMiddleware, async (req, res) => {
    try {
      const currentUser = await User.findById(req.userId)
        .populate('friendRequestsReceived', 'username firstName lastName avatarUrl');
      
      res.json(currentUser.friendRequestsReceived);
    } catch (error) {
      console.error('❌ Get friend requests error:', error);
      res.status(500).json({ message: 'Failed to get friend requests' });
    }
  });

  // Get friends list
  app.get('/api/friends', authMiddleware, async (req, res) => {
    try {
      const currentUser = await User.findById(req.userId)
        .populate('friends', 'username firstName lastName avatarUrl bio socialProfiles');
      
      res.json(currentUser.friends);
    } catch (error) {
      console.error('❌ Get friends error:', error);
      res.status(500).json({ message: 'Failed to get friends' });
    }
  });

  // Update social profiles
  app.patch('/api/profile/socials', authMiddleware, async (req, res) => {
    try {
      const { instagram, twitter, spotify, youtube } = req.body;
      
      const user = await User.findById(req.userId);
      
      user.socialProfiles = {
        instagram: instagram || '',
        twitter: twitter || '',
        spotify: spotify || '',
        youtube: youtube || ''
      };
      
      await user.save();
      
      console.log('✅ Social profiles updated');
      res.json(user);
    } catch (error) {
      console.error('❌ Update socials error:', error);
      res.status(500).json({ message: 'Failed to update social profiles' });
    }
  });



  // Search and filter playlists
  app.get('/api/playlists/search', async (req, res) => {
    try {
      const { query, genre, provider, sortBy } = req.query;
      
      console.log('🔍 Search params:', { query, genre, provider, sortBy });
      
      // Build filter object
      const filter = {};
      
      // Text search (title, tags, username)
      if (query) {
        filter.$or = [
          { title: { $regex: query, $options: 'i' } },
          { 'tags.text': { $regex: query, $options: 'i' } }
        ];
      }
      
      // Genre filter
      if (genre && genre !== 'all') {
        filter.genre = genre;
      }
      
      // Provider filter
      if (provider && provider !== 'all') {
        filter.provider = provider;
      }
      
      // Build sort object
      let sort = { createdAt: -1 }; // Default: newest first
      
      if (sortBy === 'most-liked') {
        sort = { likesCount: -1 };
      } else if (sortBy === 'most-viewed') {
        sort = { views: -1 };
      } else if (sortBy === 'most-clicked') {
        sort = { clicks: -1 };
      } else if (sortBy === 'oldest') {
        sort = { createdAt: 1 };
      }
      
      console.log('📋 Filter:', filter);
      console.log('📊 Sort:', sort);
      
      // Fetch playlists with filters
      let playlists = await Playlist.find(filter)
        .populate('ownerId', 'username avatarUrl firstName lastName')
        .sort(sort)
        .lean();
      
      // If searching by username, also filter by username
      if (query) {
        const userSearch = playlists.filter(pl => 
          pl.ownerId?.username?.toLowerCase().includes(query.toLowerCase())
        );
        
        // Combine title/tag matches with username matches (remove duplicates)
        const titleMatches = playlists.filter(pl =>
          pl.title.toLowerCase().includes(query.toLowerCase()) ||
          pl.tags?.some(tag => tag.text?.toLowerCase().includes(query.toLowerCase()))
        );
        
        playlists = [...new Set([...titleMatches, ...userSearch])];
      }
      
      // Add likesCount for sorting
      playlists = playlists.map(pl => ({
        ...pl,
        likesCount: pl.likes?.length || 0
      }));
      
      // Re-sort if needed (for username matches)
      if (sortBy === 'most-liked') {
        playlists.sort((a, b) => b.likesCount - a.likesCount);
      } else if (sortBy === 'most-viewed') {
        playlists.sort((a, b) => (b.views || 0) - (a.views || 0));
      }
      
      console.log('✅ Found playlists:', playlists.length);
      
      res.json(playlists);
    } catch (error) {
      console.error('❌ Search error:', error);
      res.status(500).json({ message: 'Failed to search playlists' });
    }
  });

 // Follow user
app.post('/api/users/:username/follow', authMiddleware, async (req, res) => {
  try {
    const targetUser = await User.findOne({ username: req.params.username.toLowerCase() });
    
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (targetUser._id.equals(req.userId)) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }
    
    // ✅ Use updateOne to bypass password validation
    const currentUser = await User.findById(req.userId);
    
    // Initialize arrays if needed
    if (!currentUser.following) currentUser.following = [];
    if (!targetUser.followers) targetUser.followers = [];
    
    // Check if already following
    if (currentUser.following.includes(targetUser._id)) {
      return res.status(400).json({ message: 'Already following' });
    }
    
    // Update using $push (no validation issues)
    await User.updateOne(
      { _id: req.userId },
      { $addToSet: { following: targetUser._id } }
    );
    
    await User.updateOne(
      { _id: targetUser._id },
      { $addToSet: { followers: req.userId } }
    );
    
    console.log('✅ Follow successful:', currentUser.username, '->', targetUser.username);
    res.json({ 
      message: 'Followed successfully',
      followingCount: (currentUser.following.length || 0) + 1
    });
  } catch (error) {
    console.error('❌ Follow error:', error);
    res.status(500).json({ message: 'Failed to follow user' });
  }
});


// Unfollow user
app.post('/api/users/:username/unfollow', authMiddleware, async (req, res) => {
  try {
    const targetUser = await User.findOne({ username: req.params.username.toLowerCase() });
    
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const currentUser = await User.findById(req.userId);
    
    // Update using $pull (no validation issues)
    await User.updateOne(
      { _id: req.userId },
      { $pull: { following: targetUser._id } }
    );
    
    await User.updateOne(
      { _id: targetUser._id },
      { $pull: { followers: req.userId } }
    );
    
    console.log('✅ Unfollow successful:', currentUser.username, '-X->', targetUser.username);
    res.json({ 
      message: 'Unfollowed successfully',
      followingCount: Math.max((currentUser.following?.length || 0) - 1, 0)
    });
  } catch (error) {
    console.error('❌ Unfollow error:', error);
    res.status(500).json({ message: 'Failed to unfollow user' });
  }
});


  // Get following status
app.get('/api/users/:username/following-status', authMiddleware, async (req, res) => {
  try {
    const targetUser = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentUser = await User.findById(req.userId);
    
    // ✅ Initialize arrays if missing
    if (!currentUser.following) currentUser.following = [];
    if (!targetUser.followers) targetUser.followers = [];

    const isFollowing = currentUser.following.some(id => id.equals(targetUser._id));

    res.json({ isFollowing });
  } catch (error) {
    console.error('❌ Following status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

  // Increment playlist view count
  app.post('/api/playlists/:id/view', async (req, res) => {
    try {
      console.log('👁️ View count increment for playlist:', req.params.id);
      
      const playlist = await Playlist.findById(req.params.id);
      if (!playlist) {
        return res.status(404).json({ message: 'Playlist not found' });
      }

      playlist.views = (playlist.views || 0) + 1;
      await playlist.save();

      console.log('✅ View count incremented to:', playlist.views);
      return res.json({ views: playlist.views });
    } catch (error) {
      console.error('❌ Increment view error:', error);
      return res.status(500).json({ message: 'Failed to increment view' });
    }
  });


  // Increment click count
  app.post('/api/playlists/:id/click', async (req, res) => {
    try {
      const playlist = await Playlist.findById(req.params.id);
      if (!playlist) return res.status(404).json({ message: 'Playlist not found' });

      playlist.clicks += 1;
      await playlist.save();

      const populated = await Playlist.findById(playlist._id)
        .populate('ownerId', 'username avatarUrl');
      return res.json(populated);
    } catch (e) {
      console.error('❌ Click increment error:', e);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // GET all playlists
  app.get('/api/playlists', async (req, res) => {
    // --- THIS ROUTE IS NOW WRAPPED IN TRY/CATCH ---
    try {
      const list = await Playlist.find({}).populate('ownerId', 'username avatarUrl').sort({ createdAt: -1 });
      return res.json(list);
    } catch (error) {
      console.error("Error fetching all playlists:", error);
      return res.status(500).json({ message: "Failed to fetch playlists" });
    }
  });

  // GET my playlists
  app.get('/api/playlists/mine', authMiddleware, async (req, res) => {
    try {
      const list = await Playlist.find({ ownerId: req.userId })
        .sort({ createdAt: -1 });
      return res.json(list);
    } catch (e) {
      console.error('❌ Fetch user playlists error:', e);
      return res.status(500).json({ message: 'Failed to fetch user playlists.' });
    }
  });

  // GET playlist by ID
  app.get('/api/playlists/:id', async (req, res) => {
    try {
      const playlist = await Playlist.findById(req.params.id)
        .populate('ownerId', 'username avatarUrl');
      if (!playlist) return res.status(404).json({ message: 'Playlist not found.' });
      return res.json(playlist);
    } catch (e) {
      console.error('❌ Fetch playlist error:', e);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // --- User Routes ---
  app.get('/api/users', async (req, res) => {
    try {
      const users = await User.find({}).select('username avatarUrl');
      return res.json(users);
    } catch (e) {
      console.error('❌ Fetch users error:', e);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/users/:username', async (req, res) => {
    try {
      const user = await User.findOne({ username: req.params.username.toLowerCase() })
        .select('firstName lastName username avatarUrl bio createdAt followers following');
      
      if (!user) return res.status(404).json({ message: 'User not found' });
      
      console.log('👤 Fetching user:', user.username);
      console.log('📊 Followers:', user.followers?.length || 0);
      console.log('📊 Following:', user.following?.length || 0);
      
      return res.json(user);
    } catch (e) {
      console.error('❌ Fetch user error:', e);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });


  app.get('/api/users/:username/playlists', async (req, res) => {
    try {
      const user = await User.findOne({ username: req.params.username.toLowerCase() });
      if (!user) return res.status(404).json({ message: 'User not found' });
      
      const playlists = await Playlist.find({ ownerId: user._id })
        .populate('ownerId', 'username avatarUrl')
        .sort({ createdAt: -1 });
      return res.json(playlists);
    } catch (e) {
      console.error('❌ Fetch user playlists error:', e);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // ==================== ADMIN ROUTES ====================

// Get all users (admin only)
app.get('/api/admin/users', authMiddleware, adminAuth, async (req, res) => {
  try {
    const users = await User.find()
      .select('_id firstName lastName username email role isBanned bannedReason createdAt')
      .sort({ createdAt: -1 });
    
    res.json(users);
  } catch (error) {
    console.error('❌ Admin get users error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Get all playlists (admin only)
app.get('/api/admin/playlists', authMiddleware, adminAuth, async (req, res) => {
  try {
    const playlists = await Playlist.find()
      .populate('ownerId', 'username email firstName lastName')
      .sort({ createdAt: -1 });
    
    res.json(playlists);
  } catch (error) {
    console.error('❌ Admin get playlists error:', error);
    res.status(500).json({ message: 'Failed to fetch playlists' });
  }
});

// Make user admin (superadmin only)
app.post('/api/admin/users/:userId/promote', authMiddleware, superAdminAuth, async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['admin', 'moderator'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { role },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('✅ User promoted:', user.username, 'to', role);
    res.json(user);
  } catch (error) {
    console.error('❌ Promote user error:', error);
    res.status(500).json({ message: 'Failed to promote user' });
  }
});

// Demote admin (superadmin only)
app.post('/api/admin/users/:userId/demote', authMiddleware, superAdminAuth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { role: 'user' },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('✅ User demoted:', user.username);
    res.json(user);
  } catch (error) {
    console.error('❌ Demote user error:', error);
    res.status(500).json({ message: 'Failed to demote user' });
  }
});

// Ban user
app.post('/api/admin/users/:userId/ban', authMiddleware, adminAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { 
        isBanned: true,
        bannedReason: reason || 'Terms violation'
      },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('✅ User banned:', user.username);
    res.json(user);
  } catch (error) {
    console.error('❌ Ban user error:', error);
    res.status(500).json({ message: 'Failed to ban user' });
  }
});

// Unban user
app.post('/api/admin/users/:userId/unban', authMiddleware, adminAuth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { 
        isBanned: false,
        bannedReason: null
      },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('✅ User unbanned:', user.username);
    res.json(user);
  } catch (error) {
    console.error('❌ Unban user error:', error);
    res.status(500).json({ message: 'Failed to unban user' });
  }
});

// Delete playlist (admin)
app.delete('/api/admin/playlists/:playlistId', authMiddleware, adminAuth, async (req, res) => {
  try {
    const playlist = await Playlist.findByIdAndDelete(req.params.playlistId);
    
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }
    
    console.log('✅ Admin deleted playlist:', playlist.title);
    res.json({ message: 'Playlist deleted' });
  } catch (error) {
    console.error('❌ Admin delete playlist error:', error);
    res.status(500).json({ message: 'Failed to delete playlist' });
  }
});



// Delete user permanently (superadmin only)
app.delete('/api/admin/users/:userId', authMiddleware, superAdminAuth, async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Prevent self-deletion
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete yourself' });
    }
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prevent deleting other superadmins
    if (user.role === 'superadmin') {
      return res.status(403).json({ message: 'Cannot delete superadmin accounts' });
    }
    
    // Delete all user's playlists
    await Playlist.deleteMany({ ownerId: userId });
    
    // Remove user from all friendships, followers, etc.
    await User.updateMany(
      {
        $or: [
          { friends: userId },
          { followers: userId },
          { following: userId },
          { friendRequests: userId }
        ]
      },
      {
        $pull: {
          friends: userId,
          followers: userId,
          following: userId,
          friendRequests: userId
        }
      }
    );
    
    // Delete the user
    await User.findByIdAndDelete(userId);
    
    console.log('✅ User deleted by admin:', user.username);
    res.json({ message: 'User and all associated data deleted successfully' });
  } catch (error) {
    console.error('❌ Admin delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});


// Get admin stats
app.get('/api/admin/stats', authMiddleware, adminAuth, async (req, res) => {
  try {
    const [totalUsers, totalPlaylists, bannedUsers, admins] = await Promise.all([
      User.countDocuments(),
      Playlist.countDocuments(),
      User.countDocuments({ isBanned: true }),
      User.countDocuments({ role: { $in: ['admin', 'superadmin', 'moderator'] } })
    ]);
    
    res.json({
      totalUsers,
      totalPlaylists,
      bannedUsers,
      admins
    });
  } catch (error) {
    console.error('❌ Admin stats error:', error);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});


  // Add this BEFORE the app.listen() section
  app.get('/', (req, res) => {
    res.json({
      message: 'Vinnu API Server',
      status: 'running',
      endpoints: {
        health: '/api/health',
        auth: '/api/auth/*',
        playlists: '/api/playlists',
        users: '/api/users',
        profile: '/api/profile'
      },
      frontend: 'http://192.168.0.105:5173'
    });
  });

  // Start server - at the very end of server.js
  connectToDatabase().then(() => {
    app.listen(PORT, HOST, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 Local:   http://localhost:${PORT}`);
      console.log(`📱 Network: http://192.168.0.105:${PORT}`);
      console.log(`📂 Uploads: ${UPLOAD_DIR}`);
      console.log('\n🎯 Frontend URLs:');
      console.log(`   📱 Desktop: http://localhost:5173`);
      console.log(`   📱 Mobile:  http://192.168.0.105:5173`);
    });
  });
