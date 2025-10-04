import { useEffect, useState } from 'react';
import api from './api';

export default function Navbar({ user, onNavigate, onLogout, view }) {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadPendingCount();
    }
  }, [user]);

  const loadPendingCount = async () => {
    try {
      const res = await api.get('/friend-requests');
      setPendingCount(res.data.length);
    } catch (error) {
      console.error('❌ Failed to load pending requests:', error);
    }
  };

  // Check if user is admin
  const isAdmin = user && ['admin', 'superadmin', 'moderator'].includes(user.role);

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-logo" onClick={() => onNavigate('home')}>
          Vinnu
        </div>
        
        {user && (
          <div className="nav-links">
            <button 
              className={view === 'home' ? 'active' : ''}
              onClick={() => onNavigate('home')}
            >
              Home
            </button>
            
            <button 
              className={view === 'dashboard' ? 'active' : ''}
              onClick={() => onNavigate('dashboard')}
            >
              Dashboard
            </button>
            
            {/* Friends link with badge */}
            <button 
              className={view === 'friends' ? 'active' : ''}
              onClick={() => onNavigate('friends')} 
              style={{ position: 'relative' }}
            >
              Friends
              {pendingCount > 0 && (
                <span className="notification-badge">{pendingCount}</span>
              )}
            </button>
            
            {/* Admin Panel - Only for admins */}
            {isAdmin && (
              <button 
                className={`admin-nav-btn ${view === 'admin' ? 'active' : ''}`}
                onClick={() => onNavigate('admin')}
              >
                🛡️ Admin
              </button>
            )}
            
            <button onClick={onLogout}>Logout</button>
          </div>
        )}
      </div>
    </nav>
  );
}
