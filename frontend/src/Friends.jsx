import { useEffect, useState, memo } from 'react';
import api from './api';
import { getImageUrl } from './utils';

function Friends({ user, onViewUserProfile }) {
  const [activeTab, setActiveTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'friends') {
        const res = await api.get('/friends');
        setFriends(res.data);
      } else {
        const res = await api.get('/friend-requests');
        setRequests(res.data);
      }
    } catch (error) {
      console.error('❌ Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (username) => {
    try {
      await api.post(`/users/${username}/accept-friend`);
      setRequests(prev => prev.filter(r => r.username !== username));
      loadData(); // Refresh
    } catch (error) {
      console.error('❌ Accept failed:', error);
      alert(error.response?.data?.message || 'Failed to accept friend request');
    }
  };

  const handleReject = async (username) => {
    try {
      await api.post(`/users/${username}/reject-friend`);
      setRequests(prev => prev.filter(r => r.username !== username));
    } catch (error) {
      console.error('❌ Reject failed:', error);
      alert(error.response?.data?.message || 'Failed to reject friend request');
    }
  };

  const handleRemoveFriend = async (username) => {
    if (!window.confirm(`Remove ${username} from friends?`)) return;
    
    try {
      await api.post(`/users/${username}/remove-friend`);
      setFriends(prev => prev.filter(f => f.username !== username));
    } catch (error) {
      console.error('❌ Remove failed:', error);
      alert(error.response?.data?.message || 'Failed to remove friend');
    }
  };

  return (
    <div className="friends-page">
      <div className="friends-container">
        <h1 className="page-title">Friends</h1>

        {/* Tabs */}
        <div className="home-tabs">
          <button 
            className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`} 
            onClick={() => setActiveTab('friends')}
          >
            My Friends ({friends.length})
          </button>
          <span className="tab-separator">|</span>
          <button 
            className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`} 
            onClick={() => setActiveTab('requests')}
          >
            Requests ({requests.length})
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="centered-container">
            <div className="spinner" />
            <p>Loading...</p>
          </div>
        ) : (
          <>
            {/* Friends List */}
            {activeTab === 'friends' && (
              <div className="friends-grid">
                {friends.length === 0 ? (
                  <div className="empty">
                    <div style={{ fontSize: '3rem', marginBottom: 16 }}>👥</div>
                    <div>No friends yet</div>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginTop: 8 }}>
                      Start by adding people you know!
                    </p>
                  </div>
                ) : (
                  friends.map(friend => (
                    <div key={friend._id} className="friend-card">
                      <div 
                        className="friend-avatar"
                        onClick={() => onViewUserProfile(friend.username)}
                        style={{ cursor: 'pointer' }}
                      >
                        {friend.avatarUrl ? (
                          <img src={getImageUrl(friend.avatarUrl)} alt={friend.username} />
                        ) : (
                          <div className="avatar-placeholder">
                            {friend.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      
                      <div className="friend-info">
                        <div 
                          className="friend-name"
                          onClick={() => onViewUserProfile(friend.username)}
                          style={{ cursor: 'pointer' }}
                        >
                          {friend.firstName} {friend.lastName}
                        </div>
                        <div className="friend-username">@{friend.username}</div>
                        {friend.bio && (
                          <div className="friend-bio">{friend.bio}</div>
                        )}
                        
                        {/* Social Links */}
                        {friend.socialProfiles && (
                          <div className="social-links-compact">
                            {friend.socialProfiles.instagram && (
                              <a 
                                href={`https://instagram.com/${friend.socialProfiles.instagram}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="social-icon"
                                title="Instagram"
                              >
                                📷
                              </a>
                            )}
                            {friend.socialProfiles.twitter && (
                              <a 
                                href={`https://x.com/${friend.socialProfiles.twitter}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="social-icon"
                                title="X/Twitter"
                              >
                                🐦
                              </a>
                            )}
                            {friend.socialProfiles.spotify && (
                              <a 
                                href={friend.socialProfiles.spotify} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="social-icon"
                                title="Spotify"
                              >
                                🎵
                              </a>
                            )}
                            {friend.socialProfiles.youtube && (
                              <a 
                                href={friend.socialProfiles.youtube} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="social-icon"
                                title="YouTube"
                              >
                                ▶️
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <button 
                        className="friend-remove-btn"
                        onClick={() => handleRemoveFriend(friend.username)}
                        title="Remove friend"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Friend Requests */}
            {activeTab === 'requests' && (
              <div className="requests-list">
                {requests.length === 0 ? (
                  <div className="empty">
                    <div style={{ fontSize: '3rem', marginBottom: 16 }}>📬</div>
                    <div>No pending requests</div>
                  </div>
                ) : (
                  requests.map(requester => (
                    <div key={requester._id} className="request-card">
                      <div 
                        className="request-avatar"
                        onClick={() => onViewUserProfile(requester.username)}
                        style={{ cursor: 'pointer' }}
                      >
                        {requester.avatarUrl ? (
                          <img src={getImageUrl(requester.avatarUrl)} alt={requester.username} />
                        ) : (
                          <div className="avatar-placeholder">
                            {requester.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      
                      <div className="request-info">
                        <div 
                          className="request-name"
                          onClick={() => onViewUserProfile(requester.username)}
                          style={{ cursor: 'pointer' }}
                        >
                          {requester.firstName} {requester.lastName}
                        </div>
                        <div className="request-username">@{requester.username}</div>
                        <div className="request-label">wants to be friends</div>
                      </div>
                      
                      <div className="request-actions">
                        <button 
                          className="accept-btn"
                          onClick={() => handleAccept(requester.username)}
                        >
                          ✓ Accept
                        </button>
                        <button 
                          className="reject-btn"
                          onClick={() => handleReject(requester.username)}
                        >
                          ✕ Decline
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default memo(Friends);
