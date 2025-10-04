import { useState } from 'react';

export default function PromptModal({ title, message, placeholder, onConfirm, onCancel, confirmText = 'Submit' }) {
  const [value, setValue] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (value.trim()) {
      onConfirm(value);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={e => e.stopPropagation()}>
        <div className="confirm-header">
          <h3>{title}</h3>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="confirm-body">
            {message && <p style={{ marginBottom: 12 }}>{message}</p>}
            <input
              type="text"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={placeholder}
              autoFocus
              style={{ 
                width: '100%', 
                padding: '10px', 
                border: '1px solid #e5e7eb', 
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>
          <div className="confirm-actions">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
