export default function ConfirmModal({ title, message, onConfirm, onCancel, confirmText = 'Confirm', isDanger = false }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={e => e.stopPropagation()}>
        <div className="confirm-header">
          <h3>{title}</h3>
        </div>
        <div className="confirm-body">
          <p>{message}</p>
        </div>
        <div className="confirm-actions">
          <button className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button 
            className={isDanger ? 'btn-danger' : 'btn-primary'} 
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
