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
app.use('/uploads', express.static(UPLOAD_DIR));

// MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vinnu';
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// --- Models ---
// User Schema - COMPLETE DEFINITION
const userSchema = new mongoose.Schema({
  firstName: { 
    type: String, 
    required: true, 
    trim: true 
  },
  lastName: { 
    type: String, 
    required: true, 
    trim: true 
  },
  username: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true 
  },
  passwordHash: { 
    type: String, 
    required: true 
  },
  avatarUrl: { 
    type: String, 
    default: '' 
  },
  bio: { 
    type: String, 
    default: '', 
    maxlength: 160 
  },
  followers: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  following: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }]
}, { timestamps: true });

// THIS LINE IS CRITICAL - DO NOT DELETE!
const User = mongoose.model('User', userSchema);

// Playlist Schema - COMPLETE DEFINITION
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

// --- Auth Helpers ---
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_EXPIRES_IN = '7d';

function authMiddleware(req, res, next) {
  console.log('🔐 Auth middleware - Cookies:', req.cookies);
  console.log('🔐 Auth middleware - Headers:', req.headers.cookie);
  
  const token = req.cookies?.token;
  
  if (!token) {
    console.log('❌ No token found in cookies');
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    console.log('✅ Token verified for user:', req.userId);
    next();
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
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR); // Use the UPLOAD_DIR we created earlier
  },
  filename: function (req, file, cb) {
    // Create unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, basename + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});


// ------------------------- ROUTES -------------------------
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// --- Auth Routes ---
// Register route with validation
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

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create new user
    const user = new User({
      firstName,
      lastName,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      passwordHash,
      avatarUrl: '',
      bio: ''
    });

    await user.save();
    console.log('✅ User registered successfully:', user.username);

    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    
    // Handle duplicate key errors (in case unique index catches it)
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

// Login
app.post('/api/auth/login', [
  body('identifier').isString().trim().notEmpty(),
  body('password').isString().notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { identifier, password } = req.body;
  try {
    const query = identifier.includes('@') ? { email: identifier.toLowerCase() } : { username: identifier.toLowerCase() };
    const user = await User.findOne(query);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ sub: user._id.toString() }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    
    // --- THIS IS THE CORRECTED FUNCTION CALL ---
    setAuthCookie(req, res, token);
    
    return res.json({ id: user._id, username: user.username, email: user.email, firstName: user.firstName, lastName: user.lastName, avatarUrl: user.avatarUrl });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Internal server error' });
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

// --- Profile Routes ---
app.get('/api/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('_id firstName lastName username email avatarUrl bio');
    if (!user) return res.status(404).json({ message: 'Not found' });
    return res.json(user);
  } catch (e) {
    console.error('❌ Profile error:', e);
    return res.status(500).json({ message: 'Internal server error' });
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
  console.log('✅ Cover uploaded:', req.file.filename);
  return res.status(201).json({ url: `/uploads/${req.file.filename}` });
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

// Follow a user - COMPLETE FIXED VERSION
app.post('/api/users/:username/follow', authMiddleware, async (req, res) => {
  try {
    const targetUsername = req.params.username;
    const currentUserId = req.userId;

    console.log('👥 Follow request from:', currentUserId, 'to follow:', targetUsername);

    // Find target user
    const targetUser = await User.findOne({ username: targetUsername });
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Can't follow yourself
    if (targetUser._id.toString() === currentUserId.toString()) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }

    // Find current user
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ message: 'Current user not found' });
    }

    // Initialize arrays if they don't exist
    if (!currentUser.following) currentUser.following = [];
    if (!targetUser.followers) targetUser.followers = [];

    // Check if already following using string comparison
    const isCurrentlyFollowing = currentUser.following.some(
      id => id.toString() === targetUser._id.toString()
    );

    if (isCurrentlyFollowing) {
      // Unfollow
      currentUser.following = currentUser.following.filter(
        id => id.toString() !== targetUser._id.toString()
      );
      targetUser.followers = targetUser.followers.filter(
        id => id.toString() !== currentUserId.toString()
      );
      console.log('💔 Unfollowed:', targetUsername);
    } else {
      // Follow
      currentUser.following.push(targetUser._id);
      targetUser.followers.push(currentUserId);
      console.log('❤️ Followed:', targetUsername);
    }

    // Save both users
    await currentUser.save();
    await targetUser.save();

    // Log the final counts
    const finalFollowersCount = targetUser.followers.length;
    const finalFollowingCount = currentUser.following.length;
    
    console.log('✅ Follow status updated');
    console.log('📊 Target user now has', finalFollowersCount, 'followers');
    console.log('📊 Current user now following', finalFollowingCount, 'users');

    return res.json({
      isFollowing: !isCurrentlyFollowing,
      followersCount: finalFollowersCount,
      followingCount: finalFollowingCount
    });
  } catch (error) {
    console.error('❌ Follow error:', error);
    return res.status(500).json({ message: 'Failed to follow/unfollow user' });
  }
});



// Check if following a user
app.get('/api/users/:username/following-status', authMiddleware, async (req, res) => {
  try {
    const targetUsername = req.params.username;
    const currentUserId = req.userId;

    const targetUser = await User.findOne({ username: targetUsername });
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ message: 'Current user not found' });
    }

    const isFollowing = currentUser.following.some(
      id => id.toString() === targetUser._id.toString()
    );

    return res.json({ 
      isFollowing,
      followersCount: targetUser.followers.length,
      followingCount: targetUser.following.length
    });
  } catch (error) {
    console.error('❌ Check following status error:', error);
    return res.status(500).json({ message: 'Failed to check following status' });
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
