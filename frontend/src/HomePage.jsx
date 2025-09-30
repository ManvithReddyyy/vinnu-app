import { useEffect, useState } from 'react';

const getApiBase = () => import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function HomePage({ user, refreshKey, onEditPlaylist, onPlaylistDeleted, onViewPlaylist }) {
  const [playlists, setPlaylists] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('playlists');

  const fetchData = async () => {
    try {
      const [playlistsRes, usersRes] = await Promise.all([
        fetch(`${getApiBase()}/api/playlists`),
        fetch(`${getApiBase()}/api/users`),
      ]);
      if (playlistsRes.ok) setPlaylists(await playlistsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
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
      const res = await fetch(`${getApiBase()}/api/playlists/${playlistId}/like`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to like playlist.');
      const updatedPlaylist = await res.json();
      setPlaylists(prev => prev.map(p => p._id === playlistId ? updatedPlaylist : p));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (playlistId) => {
    if (!window.confirm("Are you sure you want to delete this playlist?")) return;
    try {
      const res = await fetch(`${getApiBase()}/api/playlists/${playlistId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete playlist.');
      onPlaylistDeleted();
    } catch (err) {
      alert(err.message);
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
                    {pl.coverUrl ? <img src={`${getApiBase()}${pl.coverUrl}`} alt={pl.title} /> : <span className="cover-icon">🎵</span>}
                  </div>
                  <div className="playlist-info">
                    <div className="playlist-title">{pl.title}</div>
                    <div className="playlist-owner">By @{pl.ownerId?.username || '...'}</div>
                    <div className="tag-pills-card">
                      {pl.tags?.slice(0, 3).map(t => (
                        <span key={t.text} className="tag-pill-card" style={{ backgroundColor: t.color }}>{t.text}</span>
                      ))}
                    </div>
                  </div>
                  <div className="card-actions" onClick={e => e.stopPropagation()}>
                    <button className={`like-btn ${isLiked ? 'liked' : ''}`} onClick={() => handleLike(pl._id)}>
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
              <div key={u._id} className="user-card">
                <div className="user-avatar">
                  {u.avatarUrl ? <img src={`${getApiBase()}${u.avatarUrl}`} alt={u.username} /> : null}
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