import { useEffect, useState } from 'react';
import './styles.css';
import Dashboard from './Dashboard.jsx';
import Navbar from './Navbar.jsx';
import HomePage from './HomePage.jsx';
import UserProfile from './UserProfile.jsx';
import Friends from './Friends.jsx';
import FAB from './FAB.jsx';
import CreatePlaylistModal from './CreatePlaylistModal.jsx';
import PlaylistDetailModal from './PlaylistDetailModal.jsx';
import AdminPanel from './AdminPanel.jsx';
import api from './api';

// --- API base ---
function getApiBase() {
  if (import.meta.env.DEV) {
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return 'http://192.168.0.105:5000';
    }
    return '';
  }
  const env = import.meta.env.VITE_API_URL;
  if (env && /^https?:\/\/.+/.test(env)) return env;
  return 'http://localhost:5000';
}

function getImageUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  
  if (window.location.hostname === '192.168.0.105') {
    return `http://192.168.0.105:5000${path}`;
  }
  
  return `http://localhost:5000${path}`;
}

// --- Register Form ---
function RegisterForm({ onNavigate, onNeedsVerification }) {
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
        if (data.needsVerification) {
          console.log('✅ Registration successful, showing OTP form');
          setMessage('✅ OTP sent to your email!');
          
          setTimeout(() => {
            onNeedsVerification(data.email);
          }, 1000);
        } else {
          setMessage('Registered successfully! Redirecting to login…');
          setTimeout(() => onNavigate('login'), 1500);
        }
        
        setForm({
          firstName: '',
          lastName: '',
          username: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
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

// --- OTP Verification Form ---
function OTPVerificationForm({ email, onNavigate }) {
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    
    setMessage(null);
    if (!otp || otp.length !== 6) {
      setMessage('Please enter a valid 6-digit OTP');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${getApiBase()}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data?.message || 'Verification failed');
      } else {
        setMessage('✅ Email verified successfully!');
        setTimeout(() => onNavigate('login'), 1500);
      }
    } catch (err) {
      console.error('Verification error:', err);
      setMessage('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resending) return;
    
    setResending(true);
    setMessage(null);

    try {
      const res = await fetch(`${getApiBase()}/api/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (res.ok) {
        setMessage('✅ New OTP sent to your email!');
      } else {
        setMessage(data?.message || 'Failed to resend OTP');
      }
    } catch (err) {
      console.error('Resend error:', err);
      setMessage('Network error');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="centered-container">
      <div className="card">
        <h2 className="title">Verify Your Email</h2>
        <p className="subtitle">Enter the 6-digit code sent to:</p>
        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 20, color: '#000' }}>{email}</p>
        
        {message && <div className="message">{message}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="grid">
            <div className="full">
              <label htmlFor="otp">OTP Code</label>
              <input
                id="otp"
                name="otp"
                type="text"
                maxLength="6"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8, fontFamily: 'monospace' }}
                autoFocus
              />
            </div>
            <div className="full" style={{ marginTop: 6 }}>
              <button type="submit" disabled={submitting}>
                {submitting ? 'Verifying…' : 'Verify Email'}
              </button>
            </div>
            <div className="full" style={{ marginTop: 12, textAlign: 'center', fontSize: 13, color: '#6b7280' }}>
              Didn't receive the code?{' '}
              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); handleResend(); }}
                style={{ color: resending ? '#999' : '#000', fontWeight: 600 }}
              >
                {resending ? 'Sending...' : 'Resend OTP'}
              </a>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Login Form ---
function LoginForm({ onNavigate, onLoginSuccess }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [errors, setErrors] = useState({});

  const updateField = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const next = {};
    if (!form.email.trim()) next.email = 'Email or username required';
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
              <label htmlFor="email">Email or Username</label>
              <input
                id="email"
                name="email"
                value={form.email}
                onChange={updateField}
                className={errors.email ? 'error' : ''}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && <div id="email-error" className="error-text">{errors.email}</div>}
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
  const [pendingVerification, setPendingVerification] = useState(null);

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
        
        const token = localStorage.getItem('token');
        
        if (!token) {
          console.log('❌ No token found in localStorage');
          setUser(null);
          setView('home');
          return;
        }
        
        console.log('🔑 Token found, fetching profile...');
        
        const res = await api.get('/profile');
        
        if (res.status === 200) {
          const userData = res.data;
          console.log('✅ User authenticated:', userData.username);
          setUser(userData);
          
          const savedView = localStorage.getItem('currentView');
          if (savedView && savedView !== 'loading' && savedView !== 'login' && savedView !== 'register') {
            console.log('🔄 Restoring view:', savedView);
            setView(savedView);
          } else {
            setView('home');
          }
        }
      } catch (error) {
        console.error('❌ Session check failed:', error);
        localStorage.removeItem('token');
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
    localStorage.removeItem('token');
    setUser(null);
    setViewingUserProfile(null);
    setViewingPlaylist(null);
    localStorage.removeItem('currentView');
    setView('home');
  }

  function handleLogin(data) { 
    console.log('🎉 Login handler called with:', data);
    
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    
    setUser(data.user);
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
    if (pendingVerification) {
      return (
        <OTPVerificationForm
          email={pendingVerification.email}
          onNavigate={(view) => {
            setPendingVerification(null);
            setView(view);
          }}
        />
      );
    }

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
      
      case 'friends':
        return user ? (
          <Friends 
            user={user}
            onViewUserProfile={handleViewUserProfile}
          />
        ) : (
          <LoginForm onNavigate={setView} onLoginSuccess={handleLogin} />
        );
      
      case 'admin':
        return user ? (
          <AdminPanel user={user} />
        ) : (
          <LoginForm onNavigate={setView} onLoginSuccess={handleLogin} />
        );
        
      case 'register': 
        if (viewingUserProfile) setViewingUserProfile(null);
        return (
          <RegisterForm 
            onNavigate={setView}
            onNeedsVerification={(email) => {
              console.log('📧 Setting pending verification for:', email);
              setPendingVerification({ email });
            }}
          />
        );
        
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
      <Navbar user={user} onNavigate={handleNavigate} onLogout={logout} view={view} />
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
