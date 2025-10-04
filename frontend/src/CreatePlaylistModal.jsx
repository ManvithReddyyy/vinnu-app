import React, { useState, useEffect } from 'react';
import { CirclePicker } from 'react-color';

const getApiBase = () => import.meta.env.VITE_API_URL || 'http://localhost:5000';
const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${getApiBase()}${url}`;
};

const GENRES = ['Pop', 'Rock', 'Hip-Hop', 'R&B', 'Indie', 'Electronic', 'Jazz', 'Folk', 'Metal', 'Classical', 'Country', 'Blues', 'Reggae'];

const PROVIDERS = [
  { value: 'spotify', label: 'Spotify', color: '#1DB954' },
  { value: 'apple-music', label: 'Apple Music', color: '#FC3C44' },
  { value: 'youtube-music', label: 'YouTube Music', color: '#FF0000' },
  { value: 'amazon-music', label: 'Amazon Music', color: '#FF9900' },
  { value: 'soundcloud', label: 'SoundCloud', color: '#FF5500' }
];

export default function CreatePlaylistModal({ onClose, onSuccess, playlistToEdit }) {
  const isEditMode = !!playlistToEdit;

  const [form, setForm] = useState({
    coverUrl: '',
    title: '',
    provider: '',
    url: '',
    genre: [],
    tags: [],
  });
  const [tag, setTag] = useState('');
  const [color, setColor] = useState('#000000');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditMode) {
      setForm({
        coverUrl: playlistToEdit.coverUrl || '',
        title: playlistToEdit.title || '',
        provider: playlistToEdit.provider || '',
        url: playlistToEdit.url || '',
        genre: playlistToEdit.genre || [],
        tags: playlistToEdit.tags || [],
      });
    }
  }, [isEditMode, playlistToEdit]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

const uploadCover = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  setLoading(true);
  const fd = new FormData();
  fd.append('cover', file);
  
  try {
    const token = localStorage.getItem('token'); // ✅ ADD THIS
    
    const r = await fetch(`${getApiBase()}/api/playlists/cover-upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}` // ✅ ADD THIS
      },
      body: fd
    });
    const d = await r.json();
    if (!r.ok) throw new Error('Upload failed');
    set('coverUrl', d.url);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};


  const addTag = () => {
    const t = tag.trim();
    if (t && !form.tags.find(x => x.text === t)) {
      set('tags', [...form.tags, { text: t, color }]);
      setTag('');
      setShowColorPicker(false);
    }
  };

  const removeTag = (t) => set('tags', form.tags.filter(x => x.text !== t));

  const submit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError('');
  try {
    const token = localStorage.getItem('token'); // ✅ ADD THIS
    
    const r = await fetch(
      isEditMode ? `${getApiBase()}/api/playlists/${playlistToEdit._id}` : `${getApiBase()}/api/playlists/create`,
      {
        method: isEditMode ? 'PATCH' : 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // ✅ ADD THIS
        },
        body: JSON.stringify(form)
      }
    );

      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'Failed');
      onSuccess(d);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{isEditMode ? 'Edit Playlist' : 'New Playlist'}</h2>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>

          <form onSubmit={submit} className="modal-form">
            {error && <div className="form-error">{error}</div>}

            {/* Cover + Title/URL Grid */}
            <div className="form-grid">
              <div className="form-section">
                <label>Cover Image</label>
                <input type="file" id="c" accept="image/*" onChange={uploadCover} style={{ display: 'none' }} />
                <label htmlFor="c" className="cover-upload-box">
                  {loading ? '...' : form.coverUrl ? <img src={getImageUrl(form.coverUrl)} alt="Cover" /> : <span>+</span>}
                </label>
              </div>

              <div className="form-section">
                <label>Title</label>
                <input type="text" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Playlist title" required />
                
                <label style={{ marginTop: '1rem' }}>Playlist URL</label>
                <input type="url" value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://..." required />
              </div>
            </div>

            {/* Provider Buttons */}
            <div className="form-section">
              <label>Music Platform</label>
              <div className="provider-buttons">
                {PROVIDERS.map(p => (
                  <button
                    type="button"
                    key={p.value}
                    className={`provider-btn ${form.provider === p.value ? 'active' : ''}`}
                    style={{ 
                      backgroundColor: form.provider === p.value ? p.color : '#f3f4f6',
                      color: form.provider === p.value ? '#fff' : '#374151'
                    }}
                    onClick={() => set('provider', p.value)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Genre Dropdown */}
            <div className="form-section">
              <label>Genre <span className="optional">(Optional)</span></label>
              <select 
                value={form.genre[0] || ''} 
                onChange={e => set('genre', e.target.value ? [e.target.value] : [])}
                style={{ color: '#111827' }}
              >
                <option value="">Select genre</option>
                {GENRES.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Tags with Color Wheel */}
            <div className="form-section">
              <label>Tags <span className="optional">(Optional)</span></label>
              <div className="tag-input-group">
                <input 
                  type="text" 
                  className="tag-text-input"
                  placeholder="Enter tag name" 
                  value={tag} 
                  onChange={e => setTag(e.target.value)} 
                />
                <button 
                  type="button" 
                  className="color-wheel-btn"
                  style={{ backgroundColor: color }}
                  onClick={() => setShowColorPicker(true)}
                >
                  🎨
                </button>
                <button type="button" className="tag-add-btn" onClick={addTag}>Add Tag</button>
              </div>
              {form.tags.length > 0 && (
                <div className="tag-pills">
                  {form.tags.map(t => (
                    <span key={t.text} className="tag-pill" style={{ backgroundColor: t.color }}>
                      {t.text} <button type="button" onClick={() => removeTag(t.text)}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Playlist'}
            </button>
          </form>
        </div>
      </div>

      {/* Color Picker Modal */}
      {showColorPicker && (
        <div className="color-picker-modal-backdrop" onClick={() => setShowColorPicker(false)}>
          <div className="color-picker-modal" onClick={e => e.stopPropagation()}>
            <h3>Pick a Color</h3>
            <CirclePicker 
              color={color} 
              onChangeComplete={(c) => setColor(c.hex)}
              colors={['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722', '#795548', '#607d8b', '#000000']}
              width="280px"
            />
            <button 
              className="color-picker-done"
              onClick={() => setShowColorPicker(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
