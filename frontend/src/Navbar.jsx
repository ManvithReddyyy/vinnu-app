import React from 'react';

export default function Navbar({ user, onNavigate, onLogout }) {
  // Use anchor tags for simplicity, but in a larger app, you'd use a router library
  const link = (mode, text) => (
    <a 
      href="#" 
      onClick={(e) => { 
        e.preventDefault(); 
        onNavigate(mode); 
      }}
    >
      {text}
    </a>
  );

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div 
          className="nav-logo" 
          onClick={() => onNavigate(user ? 'home' : 'login')}
          style={{ cursor: 'pointer' }}
        >
          Vinnu
        </div>
        <div className="nav-links">
          {user ? (
            // Logged in - show Home, Dashboard, Logout
            <>
              {link('home', 'Home')}
              {link('dashboard', 'Dashboard')}
              <a 
                href="#" 
                onClick={(e) => { 
                  e.preventDefault(); 
                  onLogout(); 
                }}
              >
                Logout
              </a>
            </>
          ) : (
            // Not logged in - show only Login and Register
            <>
              {link('login', 'Login')}
              {link('register', 'Register')}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
