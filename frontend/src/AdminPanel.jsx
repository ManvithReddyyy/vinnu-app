import { useEffect, useState } from 'react';
import api from './api';
import { getImageUrl } from './utils';
import Toast from './Toast';
import ConfirmModal from './ConfirmModal';
import PromptModal from './PromptModal';

export default function AdminPanel({ user }) {
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Toast & Modal states
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [promptModal, setPromptModal] = useState(null);

  // Check if user is admin
  const isAdmin = user && ['admin', 'superadmin', 'moderator'].includes(user.role);
  const isSuperAdmin = user && user.role === 'superadmin';

  // Toast helper
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/stats');
      setStats(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  // Fetch playlists
  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/playlists');
      setPlaylists(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch playlists');
    } finally {
      setLoading(false);
    }
  };

  // Load data based on active tab
  useEffect(() => {
    if (!isAdmin) return;

    if (activeTab === 'stats') fetchStats();
    else if (activeTab === 'users') fetchUsers();
    else if (activeTab === 'playlists') fetchPlaylists();
  }, [activeTab, isAdmin]);

  // Ban user
  const handleBanUser = (userId, username) => {
    setPromptModal({
      title: `Ban @${username}`,
      message: 'Enter the reason for banning this user:',
      placeholder: 'Reason for ban...',
      confirmText: 'Ban User',
      onConfirm: async (reason) => {
        try {
          await api.post(`/admin/users/${userId}/ban`, { reason });
          showToast(`User @${username} banned`, 'success');
          fetchUsers();
          setPromptModal(null);
        } catch (err) {
          showToast(err.response?.data?.message || 'Failed to ban user', 'error');
        }
      },
      onCancel: () => setPromptModal(null)
    });
  };

  // Unban user
  const handleUnbanUser = (userId, username) => {
    setConfirmModal({
      title: `Unban @${username}`,
      message: 'Are you sure you want to unban this user?',
      confirmText: 'Unban',
      onConfirm: async () => {
        try {
          await api.post(`/admin/users/${userId}/unban`);
          showToast(`User @${username} unbanned`, 'success');
          fetchUsers();
          setConfirmModal(null);
        } catch (err) {
          showToast(err.response?.data?.message || 'Failed to unban user', 'error');
        }
      },
      onCancel: () => setConfirmModal(null)
    });
  };

  // Promote user
  const handlePromoteUser = (userId, username) => {
    setPromptModal({
      title: `Promote @${username}`,
      message: 'Enter the role to promote to (admin or moderator):',
      placeholder: 'admin or moderator',
      confirmText: 'Promote',
      onConfirm: async (role) => {
        if (!['admin', 'moderator'].includes(role.toLowerCase())) {
          showToast('Invalid role. Use "admin" or "moderator"', 'error');
          return;
        }

        try {
          await api.post(`/admin/users/${userId}/promote`, { role: role.toLowerCase() });
          showToast(`User @${username} promoted to ${role}`, 'success');
          fetchUsers();
          setPromptModal(null);
        } catch (err) {
          showToast(err.response?.data?.message || 'Failed to promote user', 'error');
        }
      },
      onCancel: () => setPromptModal(null)
    });
  };

  // Demote user
  const handleDemoteUser = (userId, username) => {
    setConfirmModal({
      title: `Demote @${username}`,
      message: 'Demote this user to regular user?',
      confirmText: 'Demote',
      isDanger: true,
      onConfirm: async () => {
        try {
          await api.post(`/admin/users/${userId}/demote`);
          showToast(`User @${username} demoted`, 'success');
          fetchUsers();
          setConfirmModal(null);
        } catch (err) {
          showToast(err.response?.data?.message || 'Failed to demote user', 'error');
        }
      },
      onCancel: () => setConfirmModal(null)
    });
  };

  // Delete user (SUPERADMIN ONLY)
  const handleDeleteUser = (userId, username) => {
    setConfirmModal({
      title: `⚠️ Delete @${username}`,
      message: `PERMANENTLY DELETE @${username}?\n\nThis will:\n• Delete the user account\n• Delete ALL their playlists\n• Remove them from all friendships\n\nThis action CANNOT be undone!`,
      confirmText: 'I understand, delete',
      isDanger: true,
      onConfirm: () => {
        setConfirmModal(null);
        
        // Second confirmation - type username
        setPromptModal({
          title: 'Confirm Deletion',
          message: `Type "${username}" to confirm permanent deletion:`,
          placeholder: username,
          confirmText: 'Delete Permanently',
          onConfirm: async (confirmText) => {
            if (confirmText !== username) {
              showToast('Username did not match. Deletion cancelled', 'error');
              setPromptModal(null);
              return;
            }

            try {
              await api.delete(`/admin/users/${userId}`);
              showToast(`User @${username} permanently deleted`, 'success');
              fetchUsers();
              setPromptModal(null);
            } catch (err) {
              showToast(err.response?.data?.message || 'Failed to delete user', 'error');
            }
          },
          onCancel: () => setPromptModal(null)
        });
      },
      onCancel: () => setConfirmModal(null)
    });
  };

  // Delete playlist
  const handleDeletePlaylist = (playlistId, title) => {
    setConfirmModal({
      title: 'Delete Playlist',
      message: `Are you sure you want to delete "${title}"?\n\nThis action cannot be undone.`,
      confirmText: 'Delete',
      isDanger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/admin/playlists/${playlistId}`);
          showToast('Playlist deleted', 'success');
          fetchPlaylists();
          setConfirmModal(null);
        } catch (err) {
          showToast(err.response?.data?.message || 'Failed to delete playlist', 'error');
        }
      },
      onCancel: () => setConfirmModal(null)
    });
  };

  // Not authorized
  if (!isAdmin) {
    return (
      <div className="centered-container">
        <div className="card">
          <h2>🔒 Access Denied</h2>
          <p>You don't have permission to access the admin panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>🛡️ Admin Panel</h1>
        <div className="admin-badge">{user.role.toUpperCase()}</div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📊 Stats
        </button>
        <button
          className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Users
        </button>
        <button
          className={`admin-tab ${activeTab === 'playlists' ? 'active' : ''}`}
          onClick={() => setActiveTab('playlists')}
        >
          🎵 Playlists
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="error-banner">
          ❌ {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="centered-container">
          <div className="spinner" />
          <p>Loading...</p>
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && stats && !loading && (
        <div className="admin-stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-value">{stats.totalUsers}</div>
            <div className="stat-label">Total Users</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🎵</div>
            <div className="stat-value">{stats.totalPlaylists}</div>
            <div className="stat-label">Total Playlists</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🛡️</div>
            <div className="stat-value">{stats.admins}</div>
            <div className="stat-label">Admins</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🚫</div>
            <div className="stat-value">{stats.bannedUsers}</div>
            <div className="stat-label">Banned Users</div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && !loading && (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>
                    <strong>@{u.username}</strong>
                    <br />
                    <small style={{ color: '#6b7280' }}>
                      {u.firstName} {u.lastName}
                    </small>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`role-badge role-${u.role || 'user'}`}>
                      {u.role || 'user'}
                    </span>
                  </td>
                  <td>
                    {u.isBanned ? (
                      <span className="status-banned">🚫 Banned</span>
                    ) : (
                      <span className="status-active">✅ Active</span>
                    )}
                  </td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="admin-actions">
                      {u.isBanned ? (
                        <button
                          className="btn-small btn-success"
                          onClick={() => handleUnbanUser(u._id, u.username)}
                        >
                          Unban
                        </button>
                      ) : (
                        <button
                          className="btn-small btn-danger"
                          onClick={() => handleBanUser(u._id, u.username)}
                        >
                          Ban
                        </button>
                      )}

                      {isSuperAdmin && u.role !== 'superadmin' && (
                        <>
                          {(u.role === 'user' || !u.role) ? (
                            <button
                              className="btn-small btn-primary"
                              onClick={() => handlePromoteUser(u._id, u.username)}
                            >
                              Promote
                            </button>
                          ) : (
                            <button
                              className="btn-small btn-warning"
                              onClick={() => handleDemoteUser(u._id, u.username)}
                            >
                              Demote
                            </button>
                          )}
                          
                          <button
                            className="btn-small"
                            style={{ background: '#7f1d1d', color: 'white' }}
                            onClick={() => handleDeleteUser(u._id, u.username)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Playlists Tab */}
      {activeTab === 'playlists' && !loading && (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Cover</th>
                <th>Title</th>
                <th>Owner</th>
                <th>Provider</th>
                <th>Stats</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {playlists.map((p) => (
                <tr key={p._id}>
                  <td>
                    <div style={{ width: 50, height: 50, borderRadius: 4, overflow: 'hidden' }}>
                      {p.coverUrl ? (
                        <img src={getImageUrl(p.coverUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎵</div>
                      )}
                    </div>
                  </td>
                  <td><strong>{p.title}</strong></td>
                  <td>@{p.ownerId?.username || 'Unknown'}</td>
                  <td>{p.provider}</td>
                  <td style={{ fontSize: 12, color: '#6b7280' }}>
                    👁 {p.views || 0} · 🔗 {p.clicks || 0} · ❤️ {p.likes?.length || 0}
                  </td>
                  <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="btn-small btn-danger"
                      onClick={() => handleDeletePlaylist(p._id, p.title)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          isDanger={confirmModal.isDanger}
          onConfirm={confirmModal.onConfirm}
          onCancel={confirmModal.onCancel}
        />
      )}

      {/* Prompt Modal */}
      {promptModal && (
        <PromptModal
          title={promptModal.title}
          message={promptModal.message}
          placeholder={promptModal.placeholder}
          confirmText={promptModal.confirmText}
          onConfirm={promptModal.onConfirm}
          onCancel={promptModal.onCancel}
        />
      )}
    </div>
  );
}
