import { useEffect, useState } from 'react';
import './styles.css';
import Dashboard from './Dashboard.jsx';
import Navbar from './Navbar.jsx';
import HomePage from './HomePage.jsx';
import FAB from './FAB.jsx';
import CreatePlaylistModal from './CreatePlaylistModal.jsx';
import PlaylistDetailModal from './PlaylistDetailModal.jsx';


// --- API base ---
function getApiBase() {
  const env = import.meta.env.VITE_API_URL;
  if (env) return env;
  const host = window.location.hostname;
  const protocol = window.location.protocol;
  return `${protocol}//${host}:5000`;
}

// --- Register Form ---
function RegisterForm({ onNavigate }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', username: '', email: '', password: '', confirmPassword: '' });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [errors, setErrors] = useState({});

  const updateField = (e) => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${getApiBase()}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.field) setErrors(prev => ({ ...prev, [data.field]: data.message }));
        else setMessage(data?.message || 'Registration failed');
      } else {
        setMessage('Registered successfully! Redirecting to login…');
        setForm({ firstName: '', lastName: '', username: '', email: '', password: '', confirmPassword: '' });
        setTimeout(() => onNavigate('login'), 1500);
      }
    } catch (err) {
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
              <label>First name</label>
              <input name="firstName" value={form.firstName} onChange={updateField} className={errors.firstName ? 'error' : ''} />
              {errors.firstName && <div className="error-text">{errors.firstName}</div>}
            </div>
            <div>
              <label>Last name</label>
              <input name="lastName" value={form.lastName} onChange={updateField} className={errors.lastName ? 'error' : ''} />
              {errors.lastName && <div className="error-text">{errors.lastName}</div>}
            </div>
            <div className="full">
              <label>@Username</label>
              <input name="username" value={form.username} onChange={updateField} className={errors.username ? 'error' : ''} />
              {errors.username && <div className="error-text">{errors.username}</div>}
            </div>
            <div className="full">
              <label>Email</label>
              <input name="email" type="email" value={form.email} onChange={updateField} className={errors.email ? 'error' : ''} />
              {errors.email && <div className="error-text">{errors.email}</div>}
            </div>
            <div>
              <label>Password</label>
              <input name="password" type="password" value={form.password} onChange={updateField} className={errors.password ? 'error' : ''} />
              {errors.password && <div className="error-text">{errors.password}</div>}
            </div>
            <div>
              <label>Confirm Password</label>
              <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={updateField} className={errors.confirmPassword ? 'error' : ''} />
              {errors.confirmPassword && <div className="error-text">{errors.confirmPassword}</div>}
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
    setMessage(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${getApiBase()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) setMessage(data?.message || 'Login failed');
      else onLoginSuccess(data);
    } catch (err) {
      setMessage('Network error');
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
              <label>Email or Username</label>
              <input name="identifier" value={form.identifier} onChange={updateField} className={errors.identifier ? 'error' : ''} />
              {errors.identifier && <div className="error-text">{errors.identifier}</div>}
            </div>
            <div className="full">
              <label>Password</label>
              <input name="password" type="password" value={form.password} onChange={updateField} className={errors.password ? 'error' : ''} />
              {errors.password && <div className="error-text">{errors.password}</div>}
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
  const [view, setView] = useState('loading');
  const [user, setUser] = useState(null);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [viewingPlaylist, setViewingPlaylist] = useState(null); // Detail modal state
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = () => {
    console.log('%cCheckpoint 1: triggerRefresh was called in App.jsx', 'color: lime; font-weight: bold;');
    setRefreshKey(prev => prev + 1);
  };

  const handleOpenEditModal = (playlist) => setEditingPlaylist(playlist);
  const handleViewPlaylist = (playlist) => setViewingPlaylist(playlist); // Open detail modal

  const handleModalClose = () => {
    setIsCreateModalOpen(false);
    setEditingPlaylist(null);
  };

  const handleModalSuccess = () => triggerRefresh();

  async function checkSession() {
    try {
      const res = await fetch(`${getApiBase()}/api/auth/me`, { credentials: 'include' });
      if (res.ok) setUser(await res.json());
      else setUser(null);
    } catch { setUser(null); }
    setView('home');
  }

  useEffect(() => { checkSession(); }, []);
  useEffect(() => {
    // This will run only when refreshKey changes, confirming the state update
    if (refreshKey > 0) { // Avoid logging on initial load
      console.log(`%cCheckpoint 2: refreshKey in App.jsx was updated to: ${refreshKey}`, 'color: cyan; font-weight: bold;');
    }
  }, [refreshKey]);

  async function logout() {
    try { await fetch(`${getApiBase()}/api/auth/logout`, { method: 'POST', credentials: 'include' }); } catch {}
    setUser(null);
    setView('home');
  }

  function onUserUpdate(u) { setUser(u); }
  function handleLogin(userData) { setUser(userData); setView('dashboard'); }

  const renderContent = () => {
    const pageProps = {
      user,
      refreshKey,
      onEditPlaylist: handleOpenEditModal,
      onPlaylistDeleted: triggerRefresh,
      onViewPlaylist: handleViewPlaylist,
    };

    switch (view) {
      case 'home':
        return <HomePage {...pageProps} />;
      case 'dashboard':
        return user ? <Dashboard {...pageProps} initialUser={user} onLogout={logout} onUser={onUserUpdate} /> : <LoginForm onNavigate={setView} onLoginSuccess={handleLogin} />;
      case 'register': return <RegisterForm onNavigate={setView} />;
      case 'login': return <LoginForm onNavigate={setView} onLoginSuccess={handleLogin} />;
      case 'loading': return <div className="centered-container"><p>Loading...</p></div>;
      default: return <HomePage {...pageProps} />;
    }
  };

  const isCreateEditModalOpen = isCreateModalOpen || !!editingPlaylist;

  return (
    <>
      <Navbar user={user} onNavigate={setView} onLogout={logout} />
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
        />
      )}
    </>
  );
}