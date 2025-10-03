import { useEffect, useState } from 'react';
import api from './api';
import { getImageUrl } from './utils';

export default function UserProfile({ username, onBack, onViewPlaylist, onViewUserProfile }) {
  const [user, setUser] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [showPaperPlane, setShowPaperPlane] = useState(false);

  useEffect(() => {
    async function loadUserProfile() {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('👤 Loading profile for:', username);
        
        // Fetch user info
        const userRes = await api.get(`/users/${username}`);
        console.log('✅ User loaded:', userRes.data);
        setUser(userRes.data);
        setFollowersCount(userRes.data.followers?.length || 0);
        setFollowingCount(userRes.data.following?.length || 0);
        
        // Fetch user's playlists
        const playlistsRes = await api.get(`/users/${username}/playlists`);
        console.log('✅ User playlists loaded:', playlistsRes.data.length);
        setPlaylists(playlistsRes.data);

        // Check following status
        try {
          const followStatus = await api.get(`/users/${username}/following-status`);
          setIsFollowing(followStatus.data.isFollowing);
          console.log('✅ Following status:', followStatus.data.isFollowing);
        } catch (err) {
          console.log('⚠️ Could not check following status (maybe not logged in)');
        }
      } catch (err) {
        console.error('❌ Failed to load user profile:', err);
        setError(err.response?.data?.message || 'User not found');
      } finally {
        setIsLoading(false);
      }
    }

    if (username) {
      loadUserProfile();
    }
  }, [username]);

  const handleFollowToggle = async () => {
    if (isFollowLoading) return;
    
    setIsFollowLoading(true);
    try {
      console.log('👥 Toggling follow for:', username);
      const response = await api.post(`/users/${username}/follow`);
      
      setIsFollowing(response.data.isFollowing);
      setFollowersCount(response.data.followersCount);
      
      // Trigger paper plane animation only when following
      if (response.data.isFollowing) {
        setShowPaperPlane(true);
        setTimeout(() => setShowPaperPlane(false), 1500);
      }
      
      console.log('✅ Follow toggled:', response.data.isFollowing ? 'Following' : 'Unfollowed');
    } catch (error) {
      console.error('❌ Follow toggle failed:', error);
      alert(error.response?.data?.message || 'Failed to follow/unfollow user');
    } finally {
      setIsFollowLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="user-profile-page">
        <div className="centered-container">
          <div className="spinner" />
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-profile-page">
        <div className="centered-container">
          <div style={{ fontSize: '2rem', marginBottom: 16 }}>😢</div>
          <div style={{ color: '#ef4444', marginBottom: 16 }}>{error}</div>
          <button onClick={onBack} style={{ width: 'auto', padding: '10px 20px' }}>← Go Back</button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const memberSince = new Date(user.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="user-profile-page">
      <div className="user-profile-container">
        {/* Back Button */}
        <button onClick={onBack} className="back-btn">
          ← Back
        </button>

        {/* Profile Header */}
        <div className="user-profile-header">
          <div className="user-profile-avatar">
            {user.avatarUrl ? (
              <img src={getImageUrl(user.avatarUrl)} alt={user.username} />
            ) : (
              <div className="avatar-placeholder">
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          <div className="user-profile-info">
            <h1 className="user-profile-name">
              {user.firstName} {user.lastName}
            </h1>
            <p className="user-profile-username">@{user.username}</p>
            {user.bio && <p className="user-profile-bio">{user.bio}</p>}
            
            {/* Follow/Following counts */}
            <div style={{ 
              display: 'flex', 
              gap: '20px', 
              marginTop: '12px',
              fontSize: '14px',
              color: '#6b7280'
            }}>
              <span>
                <strong style={{ color: '#111827' }}>{followersCount}</strong> Followers
              </span>
              <span>
                <strong style={{ color: '#111827' }}>{followingCount}</strong> Following
              </span>
            </div>

            <p className="user-profile-meta">Member since {memberSince}</p>

            {/* Follow Button with Paper Plane Animation */}
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <button
                onClick={handleFollowToggle}
                disabled={isFollowLoading}
                style={{
                  marginTop: '12px',
                  padding: '6px 16px',
                  borderRadius: '6px',
                  border: isFollowing ? '1px solid #d1d5db' : 'none',
                  background: isFollowing ? 'white' : 'var(--primary)',
                  color: isFollowing ? '#111827' : 'white',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: isFollowLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: isFollowLoading ? 0.6 : 1,
                  minWidth: '90px'
                }}
                onMouseEnter={(e) => {
                  if (!isFollowLoading && !isFollowing) {
                    e.target.style.filter = 'brightness(1.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.filter = 'brightness(1)';
                }}
              >
                {isFollowLoading ? '...' : (isFollowing ? 'Following' : 'Follow')}
              </button>
              
              {/* Paper Plane Animation */}
              {showPaperPlane && (
                <div className="paper-plane-animation">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="user-profile-stats">
          <div className="stat-item">
            <div className="stat-value">{playlists.length}</div>
            <div className="stat-label">Playlists</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">
              {playlists.reduce((sum, pl) => sum + (pl.likes?.length || 0), 0)}
            </div>
            <div className="stat-label">Total Likes</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">
              {playlists.reduce((sum, pl) => sum + (pl.views || 0), 0)}
            </div>
            <div className="stat-label">Total Views</div>
          </div>
        </div>

        {/* Playlists Section */}
        <div className="user-profile-playlists">
          <h2 className="section-title">Playlists by @{user.username}</h2>
          
          {playlists.length === 0 ? (
            <div className="empty">
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎵</div>
              <div>No playlists yet</div>
            </div>
          ) : (
            <div className="home-playlist-grid">
              {playlists.map(pl => (
                <div
                  key={pl._id}
                  className="playlist-card"
                  onClick={() => onViewPlaylist(pl)}
                >
                  <div className="playlist-cover">
                    {pl.coverUrl ? (
                      <img src={getImageUrl(pl.coverUrl)} alt={pl.title} />
                    ) : (
                      <div className="cover-icon">🎵</div>
                    )}
                  </div>
                  <div className="playlist-info">
                    <div className="playlist-title">{pl.title}</div>
                    <div className="playlist-owner">
                      {(pl.provider || '').replace(/-/g, ' ')}
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                      👁 {pl.views || 0} • ❤️ {pl.likes?.length || 0}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
