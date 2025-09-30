import React, { useState, useEffect } from 'react';

const getApiBase = () => import.meta.env.VITE_API_URL || 'http://localhost:5000';

const GENRES = ['Pop', 'Rock', 'Hip-Hop', 'R&B', 'Indie', 'Electronic', 'Jazz', 'Folk', 'Metal', 'Classical'];
const PREDEFINED_TAGS = [
  { text: 'Chill', color: '#3b82f6' },
  { text: 'Upbeat', color: '#ef4444' },
  { text: 'Workout', color: '#f97316' },
  { text: 'Focus', color: '#14b8a6' },
  { text: 'Party', color: '#8b5cf6' },
];
const TAG_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

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
  const [customTag, setCustomTag] = useState('');
  const [customTagColor, setCustomTagColor] = useState(TAG_COLORS[0]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill form when editing
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
  }, [playlistToEdit, isEditMode]);

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setError('');
    const formData = new FormData();
    formData.append('cover', file);

    try {
      const res = await fetch(`${getApiBase()}/api/playlists/cover-upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) throw new Error('Image upload failed.');
      const data = await res.json();
      updateField('coverUrl', data.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const toggleSelection = (field, value) => {
    const current = form[field];
    const newValue = current.includes(value) ? current.filter(item => item !== value) : [...current, value];
    updateField(field, newValue);
  };

  const handleTagToggle = (tag) => {
    const current = form.tags;
    const isSelected = current.some(t => t.text === tag.text);
    const newValue = isSelected ? current.filter(t => t.text !== tag.text) : [...current, tag];
    updateField('tags', newValue);
  };

  const handleAddCustomTag = () => {
    const trimmed = customTag.trim();
    if (trimmed && !form.tags.some(t => t.text === trimmed)) {
      updateField('tags', [...form.tags, { text: trimmed, color: customTagColor }]);
      setCustomTag('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const endpoint = isEditMode
      ? `${getApiBase()}/api/playlists/${playlistToEdit._id}`
      : `${getApiBase()}/api/playlists/create`;
    const method = isEditMode ? 'PATCH' : 'POST';

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.errors ? data.errors[0].msg : (data.message || 'Failed to save playlist.'));
      onSuccess(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditMode ? 'Edit Playlist' : 'Create New Playlist'}</h2>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="form-error">{error}</div>}

          <div className="form-grid">
            <div className="form-section cover-uploader">
              <label>Cover Image</label>
              <input type="file" id="cover-upload" accept="image/*" onChange={handleCoverUpload} style={{ display: 'none' }} />
              <label htmlFor="cover-upload" className="cover-upload-box">
                {isUploading ? 'Uploading...' : form.coverUrl ? <img src={`${getApiBase()}${form.coverUrl}`} alt="Preview" /> : '+ Upload'}
              </label>
            </div>

            <div className="form-section">
              <label htmlFor="title">Playlist Name</label>
              <input id="title" type="text" value={form.title} onChange={e => updateField('title', e.target.value)} required />

              <label htmlFor="url">Playlist URL</label>
              <input id="url" type="url" value={form.url} onChange={e => updateField('url', e.target.value)} required />

              <label>Application</label>
              <div className="provider-selector">
                {['spotify', 'apple-music', 'youtube-music', 'amazon-music'].map(p => (
                  <button
                    type="button"
                    key={p}
                    className={`provider-btn ${form.provider === p ? 'active' : ''}`}
                    onClick={() => updateField('provider', p)}
                  >
                    {p.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="form-section">
            <label>Genre (Optional)</label>
            <div className="button-group">
              {GENRES.map(g => (
                <button type="button" key={g} className={`toggle-btn ${form.genre.includes(g) ? 'active' : ''}`} onClick={() => toggleSelection('genre', g)}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="form-section">
            <label>Tags (Optional)</label>
            <div className="button-group">
              {PREDEFINED_TAGS.map(t => (
                <button
                  type="button"
                  key={t.text}
                  className={`toggle-btn ${form.tags.some(ft => ft.text === t.text) ? 'active' : ''}`}
                  onClick={() => handleTagToggle(t)}
                >
                  {t.text}
                </button>
              ))}
            </div>

            <div className="custom-tag-creator">
              <input type="text" placeholder="Add custom tag..." value={customTag} onChange={e => setCustomTag(e.target.value)} />
              <div className="color-picker">
                {TAG_COLORS.map(c => (
                  <div
                    key={c}
                    className={`color-dot ${customTagColor === c ? 'selected' : ''}`}
                    style={{ background: c }}
                    onClick={() => setCustomTagColor(c)}
                  ></div>
                ))}
              </div>
              <button type="button" onClick={handleAddCustomTag}>Add</button>
            </div>

            <div className="tag-pills">
              {form.tags.map(t => (
                <span key={t.text} className="tag-pill" style={{ backgroundColor: t.color }}>
                  {t.text} <b onClick={() => handleTagToggle(t)}>&times;</b>
                </span>
              ))}
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={isSubmitting || isUploading}>
            {isSubmitting ? (isEditMode ? 'Saving...' : 'Creating...') : isEditMode ? 'Save Changes' : 'Create Playlist'}
          </button>
        </form>
      </div>
    </div>
  );
}
