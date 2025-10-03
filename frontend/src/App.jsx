import { useEffect, useState } from 'react';
import './styles.css';
import Dashboard from './Dashboard.jsx';
import Navbar from './Navbar.jsx';
import HomePage from './HomePage.jsx';
import UserProfile from './UserProfile.jsx';
import Friends from './Friends.jsx'; // ADDED
import FAB from './FAB.jsx';
import CreatePlaylistModal from './CreatePlaylistModal.jsx';
import PlaylistDetailModal from './PlaylistDetailModal.jsx';

// --- API base ---
function getApiBase() {
  if (import.meta.env.DEV) {
    // Check if we're accessing via IP (mobile)
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return 'http://192.168.0.105:5000';
    }
    return ''; // Use proxy for localhost
  }
  const env = import.meta.env.VITE_API_URL;
  if (env && /^https?:\/\/.+/.test(env)) return env;
  return 'http://localhost:5000';
}

// Add this after getApiBase function
function getImageUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  
  // Check if we're on mobile (accessing via IP)
  if (window.location.hostname === '192.168.0.105') {
    return `http://192.168.0.105:5000${path}`;
  }
  
  return `http://localhost:5000${path}`;
}

// --- Register Form ---
function RegisterForm({ onNavigate }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [errors, setErrors] = useState({});

  const updateField = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.firstName.trim()) nextErrors.firstName = 'First name is required';
    if (!form.lastName.trim()) nextErrors.lastName = 'Last name is required';
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(form.username)) nextErrors.username = '3-30 chars, letters/numbers/_ only';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) nextErrors.email = 'Valid email required';
    if (form.password.length < 8) nextErrors.password = 'Minimum 8 characters';
    if (form.password !== form.confirmPassword) nextErrors.confirmPassword = 'Passwords do not match';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (submitting) return;
    setMessage(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${getApiBase()}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.field) setErrors(prev => ({ ...prev, [data.field]: data.message }));
        else setMessage(data?.message || 'Registration failed');
      } else {
        setMessage('Registered successfully! Redirecting to login…');
        setForm({
          firstName: '',
          lastName: '',
          username: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
        setTimeout(() => onNavigate('login'), 1500);
      }
    } catch (err) {
      console.error('Registration error:', err);
      setMessage('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="centered-container">
      <div className="card">
        <h2 className="title">Create your account</h2>
        <p className="subtitle">Join to share and explore playlists</p>
        {message && <div className="message">{message}</div>}
        <form onSubmit={handleSubmit}>
          <div className="grid">
            <div>
              <label htmlFor="firstName">First name</label>
              <input
                id="firstName"
                name="firstName"
                value={form.firstName}
                onChange={updateField}
                className={errors.firstName ? 'error' : ''}
                aria-invalid={!!errors.firstName}
                aria-describedby={errors.firstName ? 'firstName-error' : undefined}
              />
              {errors.firstName && <div id="firstName-error" className="error-text">{errors.firstName}</div>}
            </div>
            <div>
              <label htmlFor="lastName">Last name</label>
              <input
                id="lastName"
                name="lastName"
                value={form.lastName}
                onChange={updateField}
                className={errors.lastName ? 'error' : ''}
                aria-invalid={!!errors.lastName}
                aria-describedby={errors.lastName ? 'lastName-error' : undefined}
              />
              {errors.lastName && <div id="lastName-error" className="error-text">{errors.lastName}</div>}
            </div>
            <div className="full">
              <label htmlFor="username">@Username</label>
              <input
                id="username"
                name="username"
                value={form.username}
                onChange={updateField}
                className={errors.username ? 'error' : ''}
                aria-invalid={!!errors.username}
                aria-describedby={errors.username ? 'username-error' : undefined}
              />
              {errors.username && <div id="username-error" className="error-text">{errors.username}</div>}
            </div>
            <div className="full">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={updateField}
                className={errors.email ? 'error' : ''}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && <div id="email-error" className="error-text">{errors.email}</div>}
            </div>
            <div>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={updateField}
                className={errors.password ? 'error' : ''}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
              />
              {errors.password && <div id="password-error" className="error-text">{errors.password}</div>}
            </div>
            <div>
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={updateField}
                className={errors.confirmPassword ? 'error' : ''}
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
              />
              {errors.confirmPassword && <div id="confirmPassword-error" className="error-text">{errors.confirmPassword}</div>}
            </div>
            <div className="full" style={{ marginTop: 6 }}>
              <button type="submit" disabled={submitting}>{submitting ? 'Registering…' : 'Create account'}</button>
            </div>
            <div className="full" style={{ marginTop: 8, textAlign: 'center', fontSize: 13, color: '#6b7280' }}>
              Already have an account? <a href="#" onClick={e => { e.preventDefault(); onNavigate('login'); }}>Log in</a>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Login Form ---
function LoginForm({ onNavigate, onLoginSuccess }) {
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [errors, setErrors] = useState({});

  const updateField = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const next = {};
    if (!form.identifier.trim()) next.identifier = 'Email or username required';
    if (!form.password) next.password = 'Password required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (submitting) return;
    setMessage(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      console.log('🔐 Attempting login...');
      const res = await fetch(`${getApiBase()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('❌ Login failed:', data?.message);
        if (data?.field) setErrors(prev => ({ ...prev, [data.field]: data.message }));
        else setMessage(data?.message || 'Login failed');
      } else {
        console.log('✅ Login successful:', data);
        onLoginSuccess(data);
      }
    } catch (err) {
      console.error('❌ Network error:', err);
      setMessage('Network error - check console for details');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="centered-container">
      <div className="card">
        <h2 className="title">Welcome back</h2>
        <p className="subtitle">Log in to continue</p>
        {message && <div className="message">{message}</div>}
        <form onSubmit={handleSubmit}>
          <div className="grid">
            <div className="full">
              <label htmlFor="identifier">Email or Username</label>
              <input
                id="identifier"
                name="identifier"
                value={form.identifier}
                onChange={updateField}
                className={errors.identifier ? 'error' : ''}
                aria-invalid={!!errors.identifier}
                aria-describedby={errors.identifier ? 'identifier-error' : undefined}
              />
              {errors.identifier && <div id="identifier-error" className="error-text">{errors.identifier}</div>}
            </div>
            <div className="full">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={updateField}
                className={errors.password ? 'error' : ''}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
              />
              {errors.password && <div id="password-error" className="error-text">{errors.password}</div>}
            </div>
            <div className="full" style={{ marginTop: 6 }}>
              <button type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</button>
            </div>
            <div className="full" style={{ marginTop: 8, textAlign: 'center', fontSize: 13, color: '#6b7280' }}>
              New here? <a href="#" onClick={e => { e.preventDefault(); onNavigate('register'); }}>Create an account</a>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Main App ---
export default function App() {
  const [view, setView] = useState(() => {
    return localStorage.getItem('currentView') || 'loading';
  });
  
  const [user, setUser] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [viewingPlaylist, setViewingPlaylist] = useState(null);
  const [viewingUserProfile, setViewingUserProfile] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleNavigate = (newView) => {
    console.log('🧭 Navigating to:', newView);
    setViewingUserProfile(null);
    setViewingPlaylist(null);
    setView(newView);
  };

  useEffect(() => {
    if (view !== 'loading') {
      localStorage.setItem('currentView', view);
      console.log('💾 Saved current view:', view);
    }
  }, [view]);

  const triggerRefresh = () => setRefreshKey(prev => prev + 1);
  const handleOpenEditModal = playlist => setEditingPlaylist(playlist);
  const handleViewPlaylist = playlist => setViewingPlaylist(playlist);
  const handleModalClose = () => { setIsCreateModalOpen(false); setEditingPlaylist(null); };
  const handleModalSuccess = () => triggerRefresh();
  
  const handleViewUserProfile = (username) => {
    console.log('👤 Viewing user profile:', username);
    setViewingUserProfile(username);
    setViewingPlaylist(null);
  };

  // Check session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        console.log('🔍 Checking session...');
        const res = await fetch(`${getApiBase()}/api/auth/me`, { 
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log('📡 Session check status:', res.status);
        
        if (res.ok) {
          const userData = await res.json();
          console.log('✅ User authenticated:', userData.username);
          setUser(userData);
          
          const savedView = localStorage.getItem('currentView');
          if (savedView && savedView !== 'loading' && savedView !== 'login' && savedView !== 'register') {
            console.log('🔄 Restoring view:', savedView);
            setView(savedView);
          } else {
            setView('home');
          }
        } else {
          console.log('❌ No valid session');
          setUser(null);
          setView('home');
        }
      } catch (error) {
        console.error('❌ Session check failed:', error);
        setUser(null);
        setView('home');
      }
    }

    checkSession();
  }, []);

  async function logout() {
    try { 
      await fetch(`${getApiBase()}/api/auth/logout`, { 
        method: 'POST', 
        credentials: 'include' 
      }); 
      console.log('✅ Logged out successfully');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
    setUser(null);
    setViewingUserProfile(null);
    setViewingPlaylist(null);
    localStorage.removeItem('currentView');
    setView('home');
  }

  function handleLogin(userData) { 
    console.log('🎉 Login handler called with:', userData);
    setUser(userData);
    setView('dashboard');
  }
  
  function onUserUpdate(updatedUser) { 
    console.log('🔄 User update requested');
    setUser(prevUser => {
      const prevStr = JSON.stringify(prevUser);
      const newStr = JSON.stringify(updatedUser);
      
      if (prevStr === newStr) {
        console.log('⏭️ Skipping user update - no changes detected');
        return prevUser;
      }
      
      console.log('✅ User state updated with new data');
      return updatedUser;
    });
  }

  const renderContent = () => {
    // Show user profile overlay if viewing a profile
    if (viewingUserProfile && (view === 'home' || view === 'dashboard' || view === 'friends')) {
      if (!user) {
        return <LoginForm onNavigate={setView} onLoginSuccess={handleLogin} />;
      }
      return (
        <UserProfile 
          username={viewingUserProfile}
          onBack={() => setViewingUserProfile(null)}
          onViewPlaylist={handleViewPlaylist}
          onViewUserProfile={handleViewUserProfile}
        />
      );
    }

    const pageProps = {
      user,
      refreshKey,
      onEditPlaylist: handleOpenEditModal,
      onPlaylistDeleted: triggerRefresh,
      onViewPlaylist: handleViewPlaylist,
      onViewUserProfile: handleViewUserProfile
    };

    switch (view) {
      case 'home': 
        if (!user) {
          return <LoginForm onNavigate={setView} onLoginSuccess={handleLogin} />;
        }
        return <HomePage {...pageProps} />;
        
      case 'dashboard': 
        return user ? (
          <Dashboard 
            {...pageProps} 
            initialUser={user} 
            onLogout={logout} 
            onUser={onUserUpdate} 
          />
        ) : (
          <LoginForm onNavigate={setView} onLoginSuccess={handleLogin} />
        );
      
      // 👇 ADDED FRIENDS ROUTE 👇
      case 'friends':
        return user ? (
          <Friends 
            user={user}
            onViewUserProfile={handleViewUserProfile}
          />
        ) : (
          <LoginForm onNavigate={setView} onLoginSuccess={handleLogin} />
        );
      // 👆 END 👆
        
      case 'register': 
        if (viewingUserProfile) setViewingUserProfile(null);
        return <RegisterForm onNavigate={setView} />;
        
      case 'login': 
        if (viewingUserProfile) setViewingUserProfile(null);
        return <LoginForm onNavigate={setView} onLoginSuccess={handleLogin} />;
        
      case 'loading': 
        return (
          <div className="centered-container">
            <div className="spinner" />
            <p>Loading...</p>
          </div>
        );
        
      default: 
        if (!user) {
          return <LoginForm onNavigate={setView} onLoginSuccess={handleLogin} />;
        }
        return <HomePage {...pageProps} />;
    }
  };

  const isCreateEditModalOpen = isCreateModalOpen || !!editingPlaylist;

  return (
    <>
      <Navbar user={user} onNavigate={handleNavigate} onLogout={logout} />
      <main className="main-content">{renderContent()}</main>
      {user && <FAB onClick={() => setIsCreateModalOpen(true)} />}
      {isCreateEditModalOpen && (
        <CreatePlaylistModal 
          onClose={handleModalClose} 
          onSuccess={handleModalSuccess} 
          playlistToEdit={editingPlaylist} 
        />
      )}
      {viewingPlaylist && (
        <PlaylistDetailModal 
          playlist={viewingPlaylist} 
          onClose={() => setViewingPlaylist(null)}
          onViewUserProfile={handleViewUserProfile}
        />
      )}
    </>
  );
}
