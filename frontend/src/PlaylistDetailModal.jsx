import React, { useEffect } from 'react';
import api from './api';
import { getImageUrl } from './utils';

export default function PlaylistDetailModal({ playlist, onClose, onViewUserProfile }) {
  if (!playlist) {
    return null;
  }

  // Track view when modal opens
  useEffect(() => {
    const incrementView = async () => {
      try {
        console.log('👁️ Incrementing view for playlist:', playlist._id);
        await api.post(`/playlists/${playlist._id}/view`);
        console.log('✅ View incremented');
      } catch (error) {
        console.error('❌ Failed to increment view:', error);
      }
    };

    incrementView();
  }, [playlist._id]);

  const handleUsernameClick = (e) => {
    e.stopPropagation();
    if (playlist.ownerId?.username && onViewUserProfile) {
      console.log('👤 Navigating to user profile:', playlist.ownerId.username);
      onClose();
      onViewUserProfile(playlist.ownerId.username);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content detail-modal-content" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="close-btn">&times;</button>
        
        {/* Card Image */}
        <div className="detail-cover">
          {playlist.coverUrl ? (
            <img src={getImageUrl(playlist.coverUrl)} alt={playlist.title} />
          ) : (
            <div className="cover-icon-large">🎵</div>
          )}
        </div>
        
        {/* Details Below */}
        <div className="detail-info">
          <h3 className="detail-title">{playlist.title}</h3>
          <p 
            className="detail-owner"
            onClick={handleUsernameClick}
            style={{ 
              cursor: playlist.ownerId?.username ? 'pointer' : 'default',
              transition: 'color 0.2s',
              userSelect: 'none'
            }}
            onMouseEnter={(e) => {
              if (playlist.ownerId?.username) {
                e.target.style.color = '#111827';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.color = '#6b7280';
            }}
          >
            By @{playlist.ownerId?.username || 'Unknown'}
          </p>

          {/* Stats */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            fontSize: '13px', 
            color: '#6b7280',
            marginBottom: '12px'
          }}>
            <span title="Clicks">🔗 {playlist.clicks || 0}</span>
            <span title="Likes">❤️ {playlist.likes?.length || 0}</span>
          </div>
          
          <a 
            href={playlist.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="detail-link-btn"
            onClick={async () => {
              // Increment click count
              try {
                await api.post(`/playlists/${playlist._id}/click`);
                console.log('🔗 Click tracked');
              } catch (error) {
                console.error('❌ Failed to track click:', error);
              }
            }}
          >
            Open on {(playlist.provider || 'Spotify').replace(/-/g, ' ')}
          </a>
          
          <div className="detail-section">
            <h4>GENRE</h4>
            <div className="button-group">
              {playlist.genre && Array.isArray(playlist.genre) && playlist.genre.length > 0 ? (
                playlist.genre.map((g, idx) => (
                  <span key={idx} className="detail-pill genre">{g}</span>
                ))
              ) : (
                <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>No genres specified.</p>
              )}
            </div>
          </div>

          <div className="detail-section">
            <h4>TAGS</h4>
            <div className="tag-pills">
              {playlist.tags && Array.isArray(playlist.tags) && playlist.tags.length > 0 ? (
                playlist.tags.map((tag, idx) => {
                  if (typeof tag === 'string') {
                    return (
                      <span key={idx} className="tag-pill" style={{ backgroundColor: '#e0e7ff', color: '#4338ca' }}>
                        {tag}
                      </span>
                    );
                  } else if (tag && typeof tag === 'object' && tag.text) {
                    return (
                      <span 
                        key={idx} 
                        className="tag-pill" 
                        style={{ 
                          backgroundColor: tag.color || '#e0e7ff',
                          color: '#ffffff'
                        }}
                      >
                        {tag.text}
                      </span>
                    );
                  }
                  return null;
                })
              ) : (
                <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>No tags specified.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
