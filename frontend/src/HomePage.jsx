import { useEffect, useState, memo } from 'react';
import api from './api'; 
import { getImageUrl } from './utils';

function HomePage({ user, refreshKey, onEditPlaylist, onPlaylistDeleted, onViewPlaylist, onViewUserProfile }) {
  const [playlists, setPlaylists] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('playlists');
  
  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedProvider, setSelectedProvider] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [isSearching, setIsSearching] = useState(false);

  const genres = ['all', 'Pop', 'Rock', 'Hip-Hop', 'Electronic', 'Jazz', 'Classical', 'R&B', 'Country', 'Indie'];
  const providers = ['all', 'spotify', 'youtube-music', 'apple-music', 'soundcloud'];

  const fetchData = async () => {
    try {
      console.log('📥 Fetching homepage data...');
      setIsSearching(true);
      
      // Build search params
      const params = new URLSearchParams();
      if (searchQuery) params.append('query', searchQuery);
      if (selectedGenre !== 'all') params.append('genre', selectedGenre);
      if (selectedProvider !== 'all') params.append('provider', selectedProvider);
      params.append('sortBy', sortBy);
      
      const [playlistsRes, usersRes] = await Promise.all([
        api.get(`/playlists/search?${params.toString()}`),
        api.get('/users'),
      ]);
      
      console.log('✅ Playlists loaded:', playlistsRes.data.length);
      console.log('✅ Users loaded:', usersRes.data.length);
      
      setPlaylists(playlistsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshKey, searchQuery, selectedGenre, selectedProvider, sortBy]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedGenre('all');
    setSelectedProvider('all');
    setSortBy('newest');
  };

  const hasActiveFilters = searchQuery || selectedGenre !== 'all' || selectedProvider !== 'all' || sortBy !== 'newest';

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
          {/* Search & Filter Bar */}
          <div className="search-filter-bar">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search playlists, users, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <span className="search-icon"></span>
            </div>

            <div className="filters-row">
              <select 
                value={selectedGenre} 
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="filter-select"
              >
                {genres.map(g => (
                  <option key={g} value={g}>
                    {g === 'all' ? 'All Genres' : g}
                  </option>
                ))}
              </select>

              <select 
                value={selectedProvider} 
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="filter-select"
              >
                {providers.map(p => (
                  <option key={p} value={p}>
                    {p === 'all' ? 'All Platforms' : p.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>

              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="filter-select"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="most-liked">Most Liked</option>
                <option value="most-viewed">Most Viewed</option>
                <option value="most-clicked">Most Clicked</option>
              </select>

              {hasActiveFilters && (
                <button onClick={clearFilters} className="clear-filters-btn">
                  ✕ Clear
                </button>
              )}
            </div>
          </div>

          {isSearching ? (
            <div className="centered-container">
              <div className="spinner" />
              <p>Searching...</p>
            </div>
          ) : playlists.length === 0 ? (
            <div className="empty">
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔍</div>
              <div>No playlists found</div>
              {hasActiveFilters && (
                <button onClick={clearFilters} style={{ marginTop: 12 }}>
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="results-count">
                Found {playlists.length} playlist{playlists.length !== 1 ? 's' : ''}
              </div>
              <div className="home-playlist-grid">
  {playlists.map((pl) => {
    const isLiked = user && Array.isArray(pl.likes) && pl.likes.includes(user._id);
    const likeCount = Array.isArray(pl.likes) ? pl.likes.length : 0;

    return (
      <div
        key={pl._id}
        className="card dashboard-card"
        onClick={() => onViewPlaylist(pl)}
        style={{ cursor: 'pointer' }}
      >
        <div className="playlist-cover-dash">
          {pl.coverUrl ? (
            <img src={getImageUrl(pl.coverUrl)} alt={pl.title} />
          ) : (
            <div className="cover-icon-dash">🎵</div>
          )}
        </div>

        <div className="dashboard-card-info">
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
            {pl.title}
          </div>
          
          <div 
            className="subtitle" 
            style={{ margin: '4px 0 8px 0', fontSize: 13, cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              if (pl.ownerId?.username) {
                handleUserClick(pl.ownerId.username);
              }
            }}
          >
            By @{pl.ownerId?.username || '...'}
          </div>

          {/* ✅ Just pastel colored text, no background */}
          {pl.tags && pl.tags.length > 0 && (
            <div style={{ fontSize: 11, marginBottom: 8 }}>
              {pl.tags.slice(0, 3).map((t, idx) => (
                <span key={idx}>
                  <span style={{ color: t.color || '#9ca3af', fontWeight: '500' }}>
                    {t.text || t}
                  </span>
                  {idx < Math.min(pl.tags.length, 3) - 1 && <span style={{ color: '#d1d5db' }}> · </span>}
                </span>
              ))}
            </div>
          )}

          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
            <span>👁 {pl.views || 0}</span>
            <span style={{ marginLeft: 12 }}>🔗 {pl.clicks || 0}</span>
            <span style={{ marginLeft: 12 }}>❤️ {likeCount}</span>
          </div>
        </div>

        <div className="card-actions-dash" onClick={e => e.stopPropagation()}>
          <button 
            className={`like-btn ${isLiked ? 'liked' : ''}`} 
            onClick={() => handleLike(pl._id)}
            style={{ width: '100%' }}
          >
            ♥ {likeCount}
          </button>
        </div>
      </div>
    );
  })}
</div>

            </>
          )}
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

export default memo(HomePage);
