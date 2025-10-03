import { useEffect, useState } from 'react';
import api from './api';

export default function Navbar({ user, onNavigate, onLogout }) {
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

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-logo" onClick={() => onNavigate('home')}>
          Vinnu
        </div>
        
        {user && (
          <div className="nav-links">
            <button onClick={() => onNavigate('home')}>Home</button>
            <button onClick={() => onNavigate('dashboard')}>Dashboard</button>
            
            {/* Friends link with badge */}
            <button onClick={() => onNavigate('friends')} style={{ position: 'relative' }}>
              Friends
              {pendingCount > 0 && (
                <span className="notification-badge">{pendingCount}</span>
              )}
            </button>
            
            <button onClick={onLogout}>Logout</button>
          </div>
        )}
      </div>
    </nav>
  );
}
