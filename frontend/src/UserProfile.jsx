import { useEffect, useState, memo } from 'react';
import api from './api';
import { getImageUrl } from './utils';

function UserProfile({ username, onBack, onViewPlaylist, onViewUserProfile }) {
  const [user, setUser] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [showPaperPlane, setShowPaperPlane] = useState(false);
  
  // Friend system states
  const [friendStatus, setFriendStatus] = useState('none'); // 'none', 'pending', 'received', 'friends'
  const [isFriendLoading, setIsFriendLoading] = useState(false);
  const [canSeeSocials, setCanSeeSocials] = useState(false);

  useEffect(() => {
    async function loadUserProfile() {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('👤 Loading profile for:', username);
        
        const userRes = await api.get(`/users/${username}`);
        console.log('✅ User loaded:', userRes.data);
        setUser(userRes.data);
        setFollowersCount(userRes.data.followers?.length || 0);
        setFollowingCount(userRes.data.following?.length || 0);
        
        const playlistsRes = await api.get(`/users/${username}/playlists`);
        console.log('✅ User playlists loaded:', playlistsRes.data.length);
        setPlaylists(playlistsRes.data);

        // Check following status
        try {
          const followStatus = await api.get(`/users/${username}/following-status`);
          setIsFollowing(followStatus.data.isFollowing);
        } catch (err) {
          console.log('⚠️ Could not check following status');
        }
        
        // Check friend status
        try {
          const friendStatusRes = await api.get(`/users/${username}/friend-status`);
          setFriendStatus(friendStatusRes.data.status);
          setCanSeeSocials(friendStatusRes.data.canSeeSocials);
          console.log('✅ Friend status:', friendStatusRes.data.status);
        } catch (err) {
          console.log('⚠️ Could not check friend status');
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
      const response = await api.post(`/users/${username}/follow`);
      setIsFollowing(response.data.isFollowing);
      setFollowersCount(response.data.followersCount);
      
      if (response.data.isFollowing) {
        setShowPaperPlane(true);
        setTimeout(() => setShowPaperPlane(false), 1500);
      }
    } catch (error) {
      console.error('❌ Follow toggle failed:', error);
      alert(error.response?.data?.message || 'Failed to follow/unfollow user');
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleFriendAction = async (action) => {
    if (isFriendLoading) return;
    
    setIsFriendLoading(true);
    try {
      let endpoint = '';
      
      if (action === 'send') {
        endpoint = `/users/${username}/friend-request`;
      } else if (action === 'accept') {
        endpoint = `/users/${username}/accept-friend`;
      } else if (action === 'reject') {
        endpoint = `/users/${username}/reject-friend`;
      } else if (action === 'cancel') {
        endpoint = `/users/${username}/cancel-friend-request`;
      } else if (action === 'remove') {
        if (!window.confirm('Remove this friend?')) {
          setIsFriendLoading(false);
          return;
        }
        endpoint = `/users/${username}/remove-friend`;
      }
      
      const response = await api.post(endpoint);
      
      // Update status based on response
      if (response.data.status === 'friends') {
        setFriendStatus('friends');
        setCanSeeSocials(true);
      } else if (response.data.status === 'pending') {
        setFriendStatus('pending');
      } else {
        setFriendStatus('none');
        setCanSeeSocials(false);
      }
      
      console.log('✅', response.data.message);
    } catch (error) {
      console.error('❌ Friend action failed:', error);
      alert(error.response?.data?.message || 'Failed to perform action');
    } finally {
      setIsFriendLoading(false);
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
        <button onClick={onBack} className="back-btn">← Back</button>

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
            
            <div style={{ display: 'flex', gap: '20px', marginTop: '12px', fontSize: '14px', color: '#6b7280' }}>
              <span><strong style={{ color: '#111827' }}>{followersCount}</strong> Followers</span>
              <span><strong style={{ color: '#111827' }}>{followingCount}</strong> Following</span>
              {friendStatus === 'friends' && (
                <span><strong style={{ color: '#111827' }}>✓</strong> Friends</span>
              )}
            </div>

            <p className="user-profile-meta">Member since {memberSince}</p>

            {/* Social Links - Only visible to friends */}
            {canSeeSocials && user.socialProfiles && (
              <div className="social-links">
                {user.socialProfiles.instagram && (
                  <a href={`https://instagram.com/${user.socialProfiles.instagram}`} target="_blank" rel="noopener noreferrer" className="social-link">
                    📷 Instagram
                  </a>
                )}
                {user.socialProfiles.twitter && (
                  <a href={`https://x.com/${user.socialProfiles.twitter}`} target="_blank" rel="noopener noreferrer" className="social-link">
                    🐦 X/Twitter
                  </a>
                )}
                {user.socialProfiles.spotify && (
                  <a href={user.socialProfiles.spotify} target="_blank" rel="noopener noreferrer" className="social-link">
                    🎵 Spotify
                  </a>
                )}
                {user.socialProfiles.youtube && (
                  <a href={user.socialProfiles.youtube} target="_blank" rel="noopener noreferrer" className="social-link">
                    ▶️ YouTube
                  </a>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
              {/* Follow Button */}
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <button
                  onClick={handleFollowToggle}
                  disabled={isFollowLoading}
                  className={`action-button ${isFollowing ? 'secondary' : 'primary'}`}
                >
                  {isFollowLoading ? '...' : (isFollowing ? 'Following' : 'Follow')}
                </button>
                
                {showPaperPlane && (
                  <div className="paper-plane-animation">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>

              {/* Friend Button */}
              {friendStatus === 'none' && (
                <button
                  onClick={() => handleFriendAction('send')}
                  disabled={isFriendLoading}
                  className="action-button primary"
                >
                  {isFriendLoading ? '...' : '👥 Add Friend'}
                </button>
              )}
              
              {friendStatus === 'pending' && (
                <button
                  onClick={() => handleFriendAction('cancel')}
                  disabled={isFriendLoading}
                  className="action-button secondary"
                >
                  {isFriendLoading ? '...' : '⏳ Request Sent'}
                </button>
              )}
              
              {friendStatus === 'received' && (
                <>
                  <button
                    onClick={() => handleFriendAction('accept')}
                    disabled={isFriendLoading}
                    className="action-button primary"
                  >
                    {isFriendLoading ? '...' : '✓ Accept'}
                  </button>
                  <button
                    onClick={() => handleFriendAction('reject')}
                    disabled={isFriendLoading}
                    className="action-button secondary"
                  >
                    ✕ Decline
                  </button>
                </>
              )}
              
              {friendStatus === 'friends' && (
                <button
                  onClick={() => handleFriendAction('remove')}
                  disabled={isFriendLoading}
                  className="action-button secondary"
                >
                  {isFriendLoading ? '...' : '✓ Friends'}
                </button>
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

        {/* Playlists */}
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
                <div key={pl._id} className="playlist-card" onClick={() => onViewPlaylist(pl)}>
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

export default memo(UserProfile);
