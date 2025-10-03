import { useEffect, useState } from 'react';
import api from './api';
import { getImageUrl } from './utils';

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load data when component mounts or refreshKey changes
  useEffect(() => {
    let mounted = true;
    
    async function loadData() {
      if (!initialUser) {
        console.log('⚠️ No initial user, skipping data load');
        return;
      }
      
      console.log('🎯 Dashboard loading data... (refreshKey:', refreshKey, ')');
      setIsLoading(true);
      setError(null);
      
      try {
        // Load profile
        console.log('🔄 Fetching profile...');
        const profileRes = await api.get('/profile');
        
        if (mounted) {
          console.log('✅ Profile loaded:', profileRes.data.username);
          setProfile(profileRes.data);
        }
        
        // Load playlists
        console.log('📥 Fetching playlists...');
        const playlistsRes = await api.get('/playlists/mine');
        
        if (mounted) {
          console.log('✅ Playlists loaded:', playlistsRes.data.length, 'items');
          
          // Add owner info to each playlist since we know it's the current user
          const playlistsWithOwner = playlistsRes.data.map(pl => ({
            ...pl,
            ownerId: {
              _id: initialUser._id,
              username: initialUser.username,
              avatarUrl: initialUser.avatarUrl
            }
          }));
          
          console.log('📋 Playlists with owner info:', playlistsWithOwner);
          setPlaylists(playlistsWithOwner);
          
          // Calculate stats
          const totalViews = playlistsWithOwner.reduce((sum, pl) => sum + (pl.views || 0), 0);
          const totalClicks = playlistsWithOwner.reduce((sum, pl) => sum + (pl.clicks || 0), 0);
          setStats({ views: totalViews, clicks: totalClicks });
          
          console.log('📊 Stats calculated:', { views: totalViews, clicks: totalClicks });
        }
      } catch (error) {
        console.error('❌ Failed to load data:', error);
        console.error('❌ Error details:', {
          status: error.response?.status,
          message: error.response?.data?.message,
          data: error.response?.data
        });
        
        if (mounted) {
          setError(error.response?.data?.message || 'Failed to load data');
        }
        
        if (error.response?.status === 401) {
          console.log('🔒 User not authenticated, logging out...');
          if (onLogout) onLogout();
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }
    
    loadData();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  // Handle playlist deletion
  const handleDelete = async (playlistId) => {
    if (!window.confirm("Are you sure you want to delete this playlist?")) return;
    
    try {
      console.log('🗑️ Deleting playlist:', playlistId);
      await api.delete(`/playlists/${playlistId}`);
      console.log('✅ Playlist deleted successfully');
      
      if (onPlaylistDeleted) onPlaylistDeleted();
    } catch (err) {
      console.error('❌ Delete failed:', err);
      alert(err.response?.data?.message || err.message || 'Failed to delete playlist');
    }
  };

  // Save profile changes
  const saveProfile = async (e) => {
    e.preventDefault();
    
    try {
      console.log('💾 Saving profile...');
      const response = await api.patch('/profile', {
        firstName: profile.firstName,
        lastName: profile.lastName,
        username: profile.username,
        bio: profile.bio,
      });
      
      console.log('✅ Profile saved successfully');
      setProfile(response.data);
      
      if (onUser) onUser(response.data);
      
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('❌ Failed to save profile:', error);
      
      if (error.response?.data?.message) {
        alert(error.response.data.message);
      } else {
        alert('Failed to update profile');
      }
    }
  };

  // Upload avatar
  const uploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      console.log('📤 Uploading avatar...');
      const response = await api.post('/profile/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('✅ Avatar uploaded successfully');
      setProfile(response.data);
      
      if (onUser) onUser(response.data);
      
      alert('Avatar updated successfully!');
    } catch (error) {
      console.error('❌ Failed to upload avatar:', error);
      alert(error.response?.data?.message || 'Failed to upload avatar');
    }
  };

  const startEdit = () => {
    setSnapshot({ ...profile });
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setProfile({ ...snapshot });
    setIsEditing(false);
  };

  return (
    <div className="dashboardPage">
      <div className="dash">
        <div className="profileHeader">
          <div className="avatar">
            {profile?.avatarUrl ? (
              <img src={getImageUrl(profile.avatarUrl)} alt="avatar" />
            ) : (
              <div style={{ 
                width: '100%', 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                background: '#e5e7eb',
                fontSize: '2rem',
                borderRadius: '50%'
              }}>
                👤
              </div>
            )}
          </div>
          <div className="identity">
            <div className="fullName">{profile?.firstName} {profile?.lastName}</div>
            <div className="handle">@{profile?.username}</div>
            {profile?.bio && (
              <div className="bio" style={{ marginTop: 8, fontSize: 14, color: '#6b7280' }}>
                {profile.bio}
              </div>
            )}
          </div>
          <div className="dashActions">
            {isEditing ? (
              <>
                <button form="profileInlineForm" type="submit" className="actionBtn">
                  💾 Save
                </button>
                <button 
                  type="button" 
                  className="actionBtn actionBtn--muted" 
                  onClick={cancelEdit}
                >
                  ✕ Cancel
                </button>
              </>
            ) : (
              <button 
                type="button" 
                className="actionBtn actionBtn--edit" 
                onClick={startEdit}
              >
                ✎ Edit
              </button>
            )}
            <button onClick={onLogout} className="actionBtn actionBtn--muted">
              ↩ Logout
            </button>
          </div>
        </div>

        {isEditing && (
          <div className="card" style={{ marginBottom: 16 }}>
            <form id="profileInlineForm" onSubmit={saveProfile}>
              <div className="grid">
                <div>
                  <label htmlFor="firstName">First name</label>
                  <input
                    id="firstName"
                    type="text"
                    value={profile?.firstName || ''}
                    onChange={e => setProfile({ ...profile, firstName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lastName">Last name</label>
                  <input
                    id="lastName"
                    type="text"
                    value={profile?.lastName || ''}
                    onChange={e => setProfile({ ...profile, lastName: e.target.value })}
                    required
                  />
                </div>
                <div className="full">
                  <label htmlFor="username">Username</label>
                  <input
                    id="username"
                    type="text"
                    value={profile?.username || ''}
                    onChange={e => setProfile({ ...profile, username: e.target.value })}
                    required
                    minLength={3}
                    maxLength={30}
                    pattern="[a-zA-Z0-9_]+"
                    title="Only letters, numbers, and underscores"
                  />
                </div>
                <div className="full">
                  <label htmlFor="bio">Bio (optional)</label>
                  <textarea
                    id="bio"
                    value={profile?.bio || ''}
                    onChange={e => setProfile({ ...profile, bio: e.target.value })}
                    maxLength={160}
                    rows={3}
                    style={{ resize: 'vertical' }}
                    placeholder="Tell us about yourself..."
                  />
                  <small style={{ color: '#6b7280', fontSize: 12 }}>
                    {(profile?.bio || '').length}/160 characters
                  </small>
                </div>
                <div className="full">
                  <label htmlFor="avatarUpload">Change avatar</label>
                  <input
                    id="avatarUpload"
                    type="file"
                    accept="image/*"
                    onChange={uploadAvatar}
                  />
                  <small style={{ color: '#6b7280', fontSize: 12, display: 'block', marginTop: 4 }}>
                    Max file size: 5MB. Accepted formats: JPG, PNG, GIF
                  </small>
                </div>
              </div>
            </form>
          </div>
        )}

        <div className="stats">
          <div className="statCard">
            <div className="statLabel">Playlist views</div>
            <div className="statValue">{stats.views.toLocaleString()}</div>
          </div>
          <div className="statCard">
            <div className="statLabel">Link clicks</div>
            <div className="statValue">{stats.clicks.toLocaleString()}</div>
          </div>
        </div>

        <div className="sectionHeader">
          <div className="sectionTitle">My Published Playlists</div>
        </div>

        <div className="playlistGrid">
          {isLoading ? (
            <div className="empty">
              <div className="spinner" style={{ margin: '20px auto' }} />
              <div>Loading playlists...</div>
            </div>
          ) : error ? (
            <div className="empty">
              <div style={{ fontSize: '2rem', marginBottom: 16 }}>⚠️</div>
              <div style={{ color: '#ef4444', marginBottom: 16 }}>{error}</div>
              <button 
                onClick={() => window.location.reload()} 
                style={{ padding: '8px 16px', cursor: 'pointer' }}
              >
                Reload Page
              </button>
            </div>
          ) : playlists.length === 0 ? (
            <div className="empty">
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎵</div>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
                No playlists yet
              </div>
              <div style={{ marginTop: 8, fontSize: 14, color: '#6b7280' }}>
                Click the + button to create your first playlist!
              </div>
            </div>
          ) : (
            playlists.map(pl => (
              <div
                key={pl._id}
                className="card dashboard-card"
                onClick={() => {
                  console.log('🎵 Viewing playlist:', pl.title, 'Owner:', pl.ownerId);
                  if (onViewPlaylist) onViewPlaylist(pl);
                }}
                style={{ cursor: 'pointer' }}
              >
                <div className="playlist-cover-dash">
                  {pl.coverUrl ? (
                    <img 
                      src={getImageUrl(pl.coverUrl)} 
                      alt={pl.title}
                      onError={(e) => {
                        console.error('Failed to load image:', pl.coverUrl);
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="cover-icon-dash">🎵</div>
                  )}
                </div>

                <div className="dashboard-card-info">
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                    {pl.title}
                  </div>
                  <div className="subtitle" style={{ margin: '4px 0 10px 0', fontSize: 13 }}>
                    {(pl.provider || '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                  
                  {pl.genre && pl.genre.length > 0 && (
                    <div className="tag-pills-card" style={{ marginBottom: 8 }}>
                      {pl.genre.slice(0, 3).map((g, idx) => (
                        <span 
                          key={idx} 
                          className="tag-pill-card" 
                          style={{ 
                            backgroundColor: '#e0e7ff', 
                            color: '#4338ca',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: 11,
                            marginRight: 4
                          }}
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
                    <span title="Views">👁 {pl.views || 0}</span>
                    <span style={{ marginLeft: 12 }} title="Clicks">🔗 {pl.clicks || 0}</span>
                    <span style={{ marginLeft: 12 }} title="Likes">❤️ {pl.likes?.length || 0}</span>
                  </div>
                </div>

                <div className="card-actions-dash" onClick={e => e.stopPropagation()}>
                  <button 
                    className="edit-btn-card" 
                    onClick={() => {
                      console.log('✏️ Editing playlist:', pl.title);
                      if (onEditPlaylist) onEditPlaylist(pl);
                    }}
                  >
                    ✎ Edit
                  </button>
                  <button 
                    className="delete-btn-card" 
                    onClick={() => handleDelete(pl._id)}
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
