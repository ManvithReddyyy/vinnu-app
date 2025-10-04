// middleware/adminAuth.js

export const adminAuth = (req, res, next) => {
  // Check if user is logged in
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  // Check if user is admin or superadmin
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  
  next();
};

export const superAdminAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Access denied. SuperAdmin only.' });
  }
  
  next();
};
