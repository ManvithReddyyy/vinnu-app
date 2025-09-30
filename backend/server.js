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
  'http://127.0.0.1:5173',
  'http://192.168.0.105:5173',
];

app.use(cors({
  origin: allowedOrigins,
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
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all network interfaces

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// --- Models ---
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  avatarUrl: { type: String, default: '' },
  bio: { type: String, default: '', maxLength: 160 },
}, { timestamps: true });
const User = mongoose.model('User', userSchema);

const playlistSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  title: { type: String, required: true, trim: true },
  url: { type: String, required: true, trim: true },
  provider: { type: String, required: true, trim: true },
  coverUrl: { type: String, default: '' },
  genre: { type: [String], default: [] },
  tags: { type: [{ text: String, color: String }], default: [] },
  views: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  likes: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
}, { timestamps: true });
const Playlist = mongoose.model('Playlist', playlistSchema);

// --- Auth Helpers ---
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_EXPIRES_IN = '7d';

function authMiddleware(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

function setAuthCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
    // sameSite: 'lax', // This line is intentionally removed to fix the logout-on-refresh bug
  });
}

// --- Multer ---
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});
const upload = multer({ storage });

// --- Routes ---
// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Auth: Register
app.post('/api/auth/register', [
  body('firstName').isString().trim().notEmpty(),
  body('lastName').isString().trim().notEmpty(),
  body('username').isString().trim().notEmpty().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/),
  body('email').isEmail().normalizeEmail(),
  body('password').isString().isLength({ min: 8 }),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) throw new Error('Passwords do not match');
    return true;
  }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { firstName, lastName, username, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }] });
    if (existingUser) {
      const conflictField = existingUser.username === username.toLowerCase() ? 'username' : 'email';
      return res.status(409).json({ message: `${conflictField} already in use`, field: conflictField });
    }
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const user = await User.create({ firstName, lastName, username: username.toLowerCase(), email: email.toLowerCase(), passwordHash });
    return res.status(201).json({ id: user._id, username: user.username, email: user.email, firstName, lastName });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Auth: Login
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
    setAuthCookie(res, token);
    
    return res.json({ id: user._id, username: user.username, email: user.email, firstName: user.firstName, lastName: user.lastName, avatarUrl: user.avatarUrl });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Auth: Logout
app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('token', { path: '/' });
  return res.json({ ok: true });
});

// Auth: Me
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('_id firstName lastName username email avatarUrl bio');
    if (!user) return res.status(404).json({ message: 'Not found' });
    return res.json(user);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Profile Routes
app.get('/api/profile', authMiddleware, async (req, res) => {
  const user = await User.findById(req.userId).select('_id firstName lastName username email avatarUrl bio');
  if (!user) return res.status(404).json({ message: 'Not found' });
  return res.json(user);
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

    const updated = await User.findByIdAndUpdate(req.userId, updateData, { new: true }).select('_id firstName lastName username email avatarUrl bio');
    return res.json(updated);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/profile/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const url = `/uploads/${req.file.filename}`;
  const updated = await User.findByIdAndUpdate(req.userId, { avatarUrl: url }, { new: true }).select('_id firstName lastName username email avatarUrl bio');
  return res.json(updated);
});

// Playlist endpoints
app.post('/api/playlists/cover-upload', authMiddleware, upload.single('cover'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
  return res.status(201).json({ url: `/uploads/${req.file.filename}` });
});

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
    const playlist = await Playlist.create({ ownerId: req.userId, title, url, provider, coverUrl, genre, tags });
    const populatedPlaylist = await Playlist.findById(playlist._id).populate('ownerId', 'username avatarUrl');
    return res.status(201).json(populatedPlaylist);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.patch('/api/playlists/:id', authMiddleware, [
  body('title').isString().trim().notEmpty(),
  body('url').isURL(),
  body('genre').isArray(),
  body('tags').isArray()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ message: 'Playlist not found.' });
    if (playlist.ownerId.toString() !== req.userId) return res.status(403).json({ message: 'Forbidden: You do not own this playlist.' });
    
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    ).populate('ownerId', 'username avatarUrl');

    return res.json(updatedPlaylist);
  } catch (e) {
    console.error('Update playlist error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete('/api/playlists/:id', authMiddleware, async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ message: 'Playlist not found.' });
    if (playlist.ownerId.toString() !== req.userId) return res.status(403).json({ message: 'Forbidden: You do not own this playlist.' });
    
    await Playlist.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: 'Playlist deleted successfully.' });
  } catch (e) {
    console.error('Delete playlist error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/playlists/:id/like', authMiddleware, async (req, res) => {
  try {
    const pl = await Playlist.findById(req.params.id);
    if (!pl) return res.status(404).json({ message: 'Not found' });

    const userId = new mongoose.Types.ObjectId(req.userId);
    const hasLiked = pl.likes.some(likeId => likeId.equals(userId));
    const updateOperation = hasLiked ? { $pull: { likes: userId } } : { $addToSet: { likes: userId } };

    const updatedPlaylist = await Playlist.findByIdAndUpdate(req.params.id, updateOperation, { new: true }).populate('ownerId', 'username avatarUrl');
    return res.json(updatedPlaylist);
  } catch (e) {
    console.error(e);
    return res.status(400).json({ message: 'Bad id or server error' });
  }
});

app.post('/api/playlists/:id/view', async (req, res) => { /* ... unchanged ... */ });
app.post('/api/playlists/:id/click', async (req, res) => { /* ... unchanged ... */ });

// GET all playlists
app.get('/api/playlists', async (req, res) => {
  const list = await Playlist.find({}).populate('ownerId', 'username avatarUrl').sort({ createdAt: -1 });
  return res.json(list);
});

// --- CORRECTED ROUTE ORDER ---

// GET user's OWN playlists (specific route)
app.get('/api/playlists/mine', authMiddleware, async (req, res) => {
  try {
    const list = await Playlist.find({ ownerId: req.userId }).sort({ createdAt: -1 });
    return res.json(list);
  } catch (e) {
    console.error('--- ERROR FETCHING /api/playlists/mine ---:', e);
    return res.status(500).json({ message: 'Failed to fetch user playlists.' });
  }
});

// GET a SINGLE playlist by its ID (dynamic route)
app.get('/api/playlists/:id', async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id)
      .populate('ownerId', 'username avatarUrl');

    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found.' });
    }
    return res.json(playlist);
  } catch (e) {
    console.error('Get playlist by ID error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// --- User Profile Routes ---
app.get('/api/users', async (req, res) => {
  const users = await User.find({}).select('username avatarUrl');
  return res.json(users);
});

app.get('/api/users/:username', async (req, res) => {
    try {
      const user = await User.findOne({ username: req.params.username.toLowerCase() })
        .select('firstName lastName username avatarUrl bio createdAt');
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (e) {
      res.status(500).json({ message: 'Internal server error' });
    }
});
  
app.get('/api/users/:username/playlists', async (req, res) => {
    try {
      const user = await User.findOne({ username: req.params.username.toLowerCase() });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      const playlists = await Playlist.find({ ownerId: user._id })
        .populate('ownerId', 'username avatarUrl')
        .sort({ createdAt: -1 });
      res.json(playlists);
    } catch (e) {
      res.status(500).json({ message: 'Internal server error' });
    }
});

// --- Server start ---
connectToDatabase().then(() => {
  app.listen(PORT, HOST, () => {
    console.log(`Server running. Access it from your browser at:`);
    console.log(`- http://localhost:${PORT}`);
    console.log(`- http://192.168.0.105:${PORT} (from other devices on your network)`);
  });
});