import { useEffect, useState } from 'react';
import api from './api'; 
import { getImageUrl } from './utils';

export default function HomePage({ user, refreshKey, onEditPlaylist, onPlaylistDeleted, onViewPlaylist, onViewUserProfile }) {
  const [playlists, setPlaylists] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('playlists');

  const fetchData = async () => {
    try {
      console.log('📥 Fetching homepage data...');
      const [playlistsRes, usersRes] = await Promise.all([
        api.get('/playlists'),
        api.get('/users'),
      ]);
      
      console.log('✅ Playlists loaded:', playlistsRes.data.length);
      console.log('✅ Users loaded:', usersRes.data.length);
      
      setPlaylists(playlistsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  const handleLike = async (playlistId) => {
    if (!user) return alert('You must be logged in to like a playlist.');
    try {
      console.log('❤️ Attempting to like playlist:', playlistId);
      const res = await api.post(`/playlists/${playlistId}/like`);
      console.log('✅ Playlist liked successfully');
      setPlaylists(prev => prev.map(p => p._id === playlistId ? res.data : p));
    } catch (err) {
      console.error('❌ Like failed:', err);
      alert(err.response?.data?.message || 'Failed to like playlist.');
    }
  };

  const handleDelete = async (playlistId) => {
    if (!window.confirm("Are you sure you want to delete this playlist?")) return;
    try {
      console.log('🗑️ Deleting playlist:', playlistId);
      await api.delete(`/playlists/${playlistId}`);
      console.log('✅ Playlist deleted');
      onPlaylistDeleted();
    } catch (err) {
      console.error('❌ Delete failed:', err);
      alert(err.response?.data?.message || 'Failed to delete playlist.');
    }
  };

  const handleUserClick = (username) => {
    console.log('👤 Clicked user:', username);
    if (onViewUserProfile) {
      onViewUserProfile(username);
    }
  };

  return (
    <div className="home-page">
      <div className="home-tabs">
        <button className={`tab-btn ${activeTab === 'playlists' ? 'active' : ''}`} onClick={() => setActiveTab('playlists')}>Playlists</button>
        <span className="tab-separator">|</span>
        <button className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>Users</button>
      </div>

      {activeTab === 'playlists' && (
        <section>
          <div className="home-playlist-grid">
            {playlists.map((pl) => {
              const isOwner = user && pl.ownerId?._id === user.id;
              const isLiked = user && Array.isArray(pl.likes) && pl.likes.includes(user.id);
              const likeCount = Array.isArray(pl.likes) ? pl.likes.length : 0;

              return (
                <div key={pl._id} className="playlist-card" onClick={() => onViewPlaylist(pl)}>
                  <div className="playlist-cover">
                    {pl.coverUrl ? (
                      <img src={getImageUrl(pl.coverUrl)} alt={pl.title} />
                    ) : (
                      <span className="cover-icon">🎵</span>
                    )}
                  </div>
                  <div className="playlist-info">
                    <div className="playlist-title">{pl.title}</div>
                    <div 
                      className="playlist-owner" 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (pl.ownerId?.username) {
                          handleUserClick(pl.ownerId.username);
                        }
                      }}
                      style={{ 
                        cursor: pl.ownerId?.username ? 'pointer' : 'default',
                        transition: 'color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (pl.ownerId?.username) {
                          e.target.style.color = '#111827';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.color = '';
                      }}
                    >
                      By @{pl.ownerId?.username || '...'}
                    </div>
                    <div className="tag-pills-card">
                      {pl.tags?.slice(0, 3).map((t, idx) => (
                        <span 
                          key={idx} 
                          className="tag-pill-card" 
                          style={{ backgroundColor: t.color || '#e0e7ff' }}
                        >
                          {t.text || t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="card-actions" onClick={e => e.stopPropagation()}>
                    <button 
                      className={`like-btn ${isLiked ? 'liked' : ''}`} 
                      onClick={() => handleLike(pl._id)}
                    >
                      ♥ {likeCount}
                    </button>
                    {isOwner && (
                      <div className="owner-actions">
                        <button className="edit-btn-card" onClick={() => onEditPlaylist(pl)}>Edit</button>
                        <button className="delete-btn-card" onClick={() => handleDelete(pl._id)}>Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {activeTab === 'users' && (
        <section>
          <div className="home-user-grid">
            {users.map((u) => (
              <div 
                key={u._id} 
                className="user-card"
                onClick={() => handleUserClick(u.username)}
                style={{ cursor: 'pointer' }}
              >
                <div className="user-avatar">
                  {u.avatarUrl ? (
                    <img src={getImageUrl(u.avatarUrl)} alt={u.username} />
                  ) : (
                    <div className="avatar-placeholder" style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '32px',
                      fontWeight: '800',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white'
                    }}>
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="user-username">@{u.username}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
