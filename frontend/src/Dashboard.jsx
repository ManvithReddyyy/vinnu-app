import { useEffect, useState } from 'react';

function getApiBase() {
  const env = import.meta.env.VITE_API_URL;
  if (env) return env;
  const host = window.location.hostname;
  const protocol = window.location.protocol;
  return `${protocol}//${host}:5000`;
}

export default function Dashboard({
  initialUser,
  onLogout,
  onUser,
  onEditPlaylist,
  onPlaylistDeleted,
  onViewPlaylist,
  refreshKey,
}) {
  const [profile, setProfile] = useState(initialUser);
  const [stats, setStats] = useState({ views: 0, clicks: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [snapshot, setSnapshot] = useState(initialUser);
  const [playlists, setPlaylists] = useState([]);

  async function refreshProfile() {
    const res = await fetch(`${getApiBase()}/api/profile`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      onUser?.(data);
    }
  }

  async function fetchPlaylists() {
    const res = await fetch(`${getApiBase()}/api/playlists/mine`, { credentials: 'include' });
    if (res.ok) setPlaylists(await res.json());
  }

  useEffect(() => {
    refreshProfile();
    fetchPlaylists();
  }, [refreshKey]);


  async function handleDelete(playlistId) {
    if (!window.confirm("Are you sure you want to delete this playlist?")) return;
    try {
      const res = await fetch(`${getApiBase()}/api/playlists/${playlistId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete playlist.');
      onPlaylistDeleted?.();
    } catch (err) {
      alert(err.message);
    }
  }

  // Other component functions (saveProfile, uploadAvatar, etc.)
  const saveProfile = async (e) => { e.preventDefault(); /* ... */ };
  const uploadAvatar = async (e) => { /* ... */ };
  const startEdit = () => { setSnapshot(profile); setIsEditing(true); };
  const cancelEdit = () => { setProfile(snapshot); setIsEditing(false); };


  return (
    <div className="dashboardPage">
      <div className="dash">
        <div className="profileHeader">
          <div className="avatar">{profile?.avatarUrl && <img src={`${getApiBase()}${profile.avatarUrl}`} alt="avatar" />}</div>
          <div className="identity">
            <div className="fullName">{profile?.firstName} {profile?.lastName}</div>
            <div className="handle">@{profile?.username}</div>
          </div>
          <div className="dashActions">
            {isEditing ? (
              <>
                <button form="profileInlineForm" type="submit" className="actionBtn">💾 Save</button>
                <button type="button" className="actionBtn actionBtn--muted" onClick={cancelEdit}>✕ Cancel</button>
              </>
            ) : (
              <button type="button" className="actionBtn actionBtn--edit" onClick={startEdit}>✎ Edit</button>
            )}
            <button onClick={onLogout} className="actionBtn actionBtn--muted">↩ Logout</button>
          </div>
        </div>

        {isEditing && (
          <div className="card" style={{ marginBottom: 16 }}>
            <form id="profileInlineForm" onSubmit={saveProfile}>
              <div className="grid">
                 <div>
                   <label>First name</label>
                   <input value={profile?.firstName || ''} onChange={e => setProfile({ ...profile, firstName: e.target.value })} />
                 </div>
                 <div>
                   <label>Last name</label>
                   <input value={profile?.lastName || ''} onChange={e => setProfile({ ...profile, lastName: e.target.value })} />
                 </div>
                 <div className="full">
                   <label>Change avatar</label>
                   <input type="file" accept="image/*" onChange={uploadAvatar} />
                 </div>
              </div>
            </form>
          </div>
        )}

        <div className="stats">
          <div className="statCard"><div className="statLabel">Playlist views</div><div className="statValue">{stats.views}</div></div>
          <div className="statCard"><div className="statLabel">Link clicks</div><div className="statValue">{stats.clicks}</div></div>
        </div>

        <div className="sectionHeader"><div className="sectionTitle">My Published Playlists</div></div>
        
        <div className="playlistGrid">
          {playlists.length === 0 ? (
            <div className="empty">You haven't published any playlists yet.</div>
          ) : (
            playlists.map(pl => (
              <div
                key={pl._id}
                className="card dashboard-card"
                onClick={() => onViewPlaylist?.(pl)}
              >
                {/* --- NEWLY ADDED IMAGE SECTION --- */}
                <div className="playlist-cover-dash">
                  {pl.coverUrl ? (
                    <img src={`${getApiBase()}${pl.coverUrl}`} alt={pl.title} />
                  ) : (
                    <div className="cover-icon-dash">🎵</div>
                  )}
                </div>
                {/* --- END NEWLY ADDED IMAGE SECTION --- */}

                <div className="dashboard-card-info">
                  <div style={{ fontWeight: 700 }}>{pl.title}</div>
                  <div className="subtitle" style={{ margin: '4px 0 10px 0' }}>{(pl.provider || '').replace('-', ' ')}</div>
                  <div className="tag-pills-card">
                    {pl.tags?.slice(0, 3).map(t => (
                      <span key={t.text} className="tag-pill-card" style={{ backgroundColor: t.color }}>{t.text}</span>
                    ))}
                  </div>
                </div>

                <div className="card-actions-dash" onClick={e => e.stopPropagation()}>
                  <button className="edit-btn-card" onClick={() => onEditPlaylist?.(pl)}>Edit</button>
                  <button className="delete-btn-card" onClick={() => handleDelete(pl._id)}>Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}