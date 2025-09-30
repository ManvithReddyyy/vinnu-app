import React from 'react';

const getApiBase = () => import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function PlaylistDetailModal({ playlist, onClose }) {
  // This guard clause is important
  if (!playlist) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content detail-modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Playlist Details</h2>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>
        <div className="playlist-detail-body">
          <div className="detail-cover">
            {playlist.coverUrl ? (
              <img src={`${getApiBase()}${playlist.coverUrl}`} alt={playlist.title} />
            ) : (
              <div className="cover-icon-large">🎵</div>
            )}
          </div>
          <div className="detail-info">
            <h3 className="detail-title">{playlist.title}</h3>
            <p className="detail-owner">By @{playlist.ownerId?.username || 'Unknown'}</p>
            
            <a href={playlist.url} target="_blank" rel="noopener noreferrer" className="detail-link-btn">
              Open on {(playlist.provider || '').replace(/-/g, ' ')}
            </a>
            
            <div className="detail-section">
              <h4>Genre</h4>
              <div className="button-group">
                {(playlist.genre || []).length > 0 ? playlist.genre.map(g => (
                  <span key={g} className="detail-pill genre">{g}</span>
                )) : <p>No genres specified.</p>}
              </div>
            </div>

            <div className="detail-section">
              <h4>Tags</h4>
              <div className="tag-pills">
                {(playlist.tags || []).length > 0 ? playlist.tags.map(t => (
                   <span key={t.text} className="tag-pill" style={{ backgroundColor: t.color }}>{t.text}</span>
                )) : <p>No tags specified.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}