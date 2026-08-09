import { AlertTriangle, X } from 'lucide-react';
import './ConfirmDialog.css';

const ConfirmDialog = ({ isOpen, title, message, confirmLabel = 'Delete', cancelLabel = 'Cancel', danger = true, showCancel = true, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="confirm-overlay" onClick={showCancel ? onCancel : undefined}>
      <div className="confirm-dialog" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog-header">
          <div className={`confirm-icon ${danger ? 'danger' : ''}`}>
            <AlertTriangle size={22} />
          </div>
          {showCancel && (
            <button type="button" className="btn-icon" onClick={onCancel} aria-label="Close dialog">
              <X size={20} />
            </button>
          )}
        </div>
        <h2 className="confirm-dialog-title">{title}</h2>
        <p className="confirm-dialog-message">{message}</p>
        <div className="confirm-dialog-actions">
          {showCancel && (
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              {cancelLabel}
            </button>
          )}
          <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
