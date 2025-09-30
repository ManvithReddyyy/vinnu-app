import React from 'react';

export default function Navbar({ user, onNavigate, onLogout }) {
  // Use anchor tags for simplicity, but in a larger app, you'd use a router library
  const link = (mode, text) => <a href="#" onClick={(e) => { e.preventDefault(); onNavigate(mode); }}>{text}</a>;

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-logo" onClick={() => onNavigate('home')}>
          Vinnu
        </div>
        <div className="nav-links">
          {link('home', 'Home')}
          {user ? (
            <>
              {link('dashboard', 'Dashboard')}
              <a href="#" onClick={(e) => { e.preventDefault(); onLogout(); }}>Logout</a>
            </>
          ) : (
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