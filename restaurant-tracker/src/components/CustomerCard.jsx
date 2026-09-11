import React, { useState } from 'react';
import './CustomerCard.css';
import { IndianRupee, Calendar, Phone, Trash2, Edit2, RefreshCw, MessageCircle, BellRing, Banknote, MoreVertical } from 'lucide-react';

const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const formatCurrency = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const CustomerCard = ({ customer, onDelete, onEdit, onRenew, onRecordPayment }) => {
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isRenewConfirmOpen, setIsRenewConfirmOpen] = useState(false);
  const [isRenewPaid, setIsRenewPaid] = useState(true);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // Calculate days left
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(customer.endDate);
  endDate.setHours(0, 0, 0, 0);
  const startDate = new Date(customer.startDate);
  startDate.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
  const gapDays = Math.ceil((today - endDate) / (1000 * 60 * 60 * 24));
  const isGapMoreThan31 = gapDays > 31;
  const isActive = daysLeft >= 0;
  const isExpiringSoon = daysLeft >= 0 && daysLeft <= 3;

  // Payment state (legacy customers without paidAmount are treated as fully paid)
  const amount = Number(customer.amount) || 0;
  const paid = Number(customer.paidAmount ?? amount) || 0;
  const pending = Math.max(0, amount - paid);
  const paymentStatus = pending === 0 ? 'paid' : paid === 0 ? 'pending' : 'partial';

  // Build WhatsApp link (strip non-numeric chars, ensure country code)
  const getWhatsAppNumber = () => {
    let phone = customer.mobile.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '91' + phone.substring(1);
    if (!phone.startsWith('91')) phone = '91' + phone;
    return phone;
  };

  const getWhatsAppLink = () => `https://wa.me/${getWhatsAppNumber()}`;

  const getReminderMessage = () => {
    if (pending > 0) {
      return `Hi ${customer.name}, you have a pending bill of ${formatCurrency(pending)} at Bhoothnath. Please clear your outstanding balance at your earliest convenience. We look forward to serving you again!`;
    }
    if (!isActive) {
      return `Hi ${customer.name}, your Bhoothnath membership expired on ${new Date(customer.endDate).toLocaleDateString('en-IN')}. Renew today to keep enjoying your favourite meals with us!`;
    }
    return `Hi ${customer.name}, your Bhoothnath membership expires on ${new Date(customer.endDate).toLocaleDateString('en-IN')}${daysLeft > 0 ? ` (in ${daysLeft} day${daysLeft === 1 ? '' : 's'})` : ''}. Renew today to keep enjoying your membership benefits and your favourite meals with us!`;
  };

  const getReminderLink = () => `https://wa.me/${getWhatsAppNumber()}?text=${encodeURIComponent(getReminderMessage())}`;

  const getRenewPreview = () => {
    if (customStartDate && customEndDate) {
      return {
        newStart: new Date(customStartDate + 'T00:00:00'),
        newEnd: new Date(customEndDate + 'T00:00:00'),
      };
    }

    const defaultStart = new Date(today);
    const defaultEnd = new Date(today);
    defaultEnd.setDate(defaultEnd.getDate() + 29);
    return { newStart: defaultStart, newEnd: defaultEnd };
  };

  // Quick renew handler — asks whether renewal amount is paid
  const handleRenew = () => {
    const { newStart, newEnd } = getRenewPreview();
    const renewedCustomer = {
      ...customer,
      startDate: formatLocalDate(newStart),
      endDate: formatLocalDate(newEnd),
      paidAmount: isRenewPaid ? amount : 0,
    };
    onRenew?.(renewedCustomer);
  };

  const handleConfirmRenew = () => {
    setIsRenewConfirmOpen(false);
    handleRenew();
  };

  const handleStartDateChange = (e) => {
    const newS = e.target.value;
    setCustomStartDate(newS);
    if (newS) {
      const sDate = new Date(newS + 'T00:00:00');
      sDate.setDate(sDate.getDate() + 29); // 30 days total including start date
      setCustomEndDate(formatLocalDate(sDate));
    }
  };

  const openRenewDialog = () => {
    setIsDeleteConfirmOpen(false);
    setIsRenewPaid(pending === 0);
    
    let baseStart = new Date(endDate);
    if (baseStart < today) {
      baseStart = new Date(today);
    } else {
      baseStart.setDate(baseStart.getDate() + 1);
    }
    
    const baseEnd = new Date(baseStart);
    baseEnd.setDate(baseEnd.getDate() + 29); // 30 days total including start date
    
    setCustomStartDate(formatLocalDate(baseStart));
    setCustomEndDate(formatLocalDate(baseEnd));

    setIsRenewConfirmOpen(true);
  };

  const handleDelete = () => {
    setIsDeleteConfirmOpen(true);
  };

  const closeActionsMenu = () => setIsActionsMenuOpen(false);

  return (
    <div className={`customer-card glass-panel ${isExpiringSoon ? 'card-expiring' : ''} ${!isActive ? 'card-expired' : ''}`}>
      <div className="card-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h3 className="customer-name">{customer.name}</h3>
          <div className="customer-phone">
            <Phone size={14} />
            <span>{customer.mobile}</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: daysLeft <= 3 && daysLeft >= 0 ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: '500' }}>
            {daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? 'Expires today' : `Expired ${Math.abs(daysLeft)} ${Math.abs(daysLeft) === 1 ? 'day' : 'days'} ago`}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <span className={`status-badge ${isActive ? 'active' : 'expired'}`}>
            {isActive ? 'Active' : 'Expired'}
          </span>
          <div className="card-actions">
            <a 
              href={getWhatsAppLink()} 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn-icon" 
              style={{ color: '#25D366', padding: '4px', display: 'flex', alignItems: 'center' }}
              title="WhatsApp"
            >
              <MessageCircle size={16} />
            </a>
            <button 
              className="btn-icon" 
              style={{ color: 'var(--text-secondary)', padding: '4px' }}
              onClick={() => {
                if (!isActionsMenuOpen) setIsDeleteConfirmOpen(false);
                setIsActionsMenuOpen(!isActionsMenuOpen);
              }}
              title="More actions"
            >
              <MoreVertical size={16} />
            </button>
            {isActionsMenuOpen && (
              <>
                <div className="actions-menu-overlay" onClick={closeActionsMenu}></div>
                <div className="actions-menu glass-panel">
                  <a 
                    href={getReminderLink()} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="actions-menu-item"
                    onClick={closeActionsMenu}
                  >
                    <BellRing size={15} />
                    {pending > 0 ? 'Payment reminder' : !isActive ? 'Expired — renew reminder' : 'Expiry reminder'}
                  </a>
                  <button 
                    className="actions-menu-item"
                    onClick={() => { closeActionsMenu(); onEdit?.(customer); }}
                  >
                    <Edit2 size={15} />
                    Edit
                  </button>
                  {pending > 0 && (
                    <button 
                      className="actions-menu-item"
                      onClick={() => { closeActionsMenu(); onRecordPayment?.(customer); }}
                    >
                      <Banknote size={15} />
                      Record payment
                    </button>
                  )}
                  {(isExpiringSoon || !isActive) && (
                    <button 
                      className="actions-menu-item"
                      onClick={() => { closeActionsMenu(); openRenewDialog(); }}
                    >
                      <RefreshCw size={15} />
                      Quick renew
                    </button>
                  )}
                  <button 
                    className="actions-menu-item danger"
                    onClick={() => { closeActionsMenu(); handleDelete(); }}
                  >
                    <Trash2 size={15} />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="card-divider"></div>

      <div className="plan-details">
        <div className="plan-name">
          <span className="label">Plan</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="value">{customer.plan}</span>
            {customer.planType && (
              <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                {customer.planType}
              </span>
            )}
          </div>
        </div>
        <div className="plan-amount">
          <span className="label">Amount</span>
          <span className="value amount-value">
            <IndianRupee size={14} />
            {customer.amount}
          </span>
        </div>
      </div>

      <div className="payment-status-row">
        <span className={`payment-badge ${paymentStatus}`}>
          {paymentStatus === 'paid' ? 'Paid' : paymentStatus === 'pending' ? `Pending ${formatCurrency(pending)}` : `Partial · ${formatCurrency(pending)} due`}
        </span>
        <span className="payment-paid-label">
          Paid {formatCurrency(paid)}
        </span>
      </div>

      <div className="date-details">
        <div className="date-item">
          <Calendar size={14} />
          <span>Start: {new Date(customer.startDate).toLocaleDateString('en-GB')}</span>
        </div>
        <div className="date-item">
          <Calendar size={14} />
          <span>End: {new Date(customer.endDate).toLocaleDateString('en-GB')}</span>
        </div>
      </div>

      {customer.notes && (
        <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontWeight: '500', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Notes</span>
            {customer.notes.length > 50 && (
              <button 
                onClick={() => setIsNotesExpanded(!isNotesExpanded)}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
              >
                {isNotesExpanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
            {isNotesExpanded || customer.notes.length <= 50 
              ? customer.notes 
              : `${customer.notes.substring(0, 50)}...`}
          </div>
        </div>
      )}

      {isDeleteConfirmOpen && (
        <div className="delete-inline">
          <div className="delete-inline-text">
            <Trash2 size={15} />
            <p>Delete <strong>{customer.name}</strong>? This cannot be undone.</p>
          </div>
          <div className="delete-inline-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setIsDeleteConfirmOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-danger" onClick={() => { setIsDeleteConfirmOpen(false); onDelete?.(customer.id); }}>
              Delete
            </button>
          </div>
        </div>
      )}

      {isRenewConfirmOpen && (
        <div className="renew-confirm">
          <div className="renew-confirm-header">
            <RefreshCw size={15} />
            <strong>Renew {customer.name}?</strong>
          </div>
          <p className="renew-confirm-dates">
            {(() => { const { newStart, newEnd } = getRenewPreview(); return `${newStart.toLocaleDateString('en-GB')} – ${newEnd.toLocaleDateString('en-GB')} · ${customer.plan} · ${formatCurrency(amount)}`; })()}
          </p>
          <div className="renew-manual-dates">
            <div className="renew-date-group">
              <label>New Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={handleStartDateChange}
                className="renew-date-input"
              />
            </div>
            <div className="renew-date-group">
              <label>New End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="renew-date-input"
              />
            </div>
          </div>
          {pending > 0 && (
            <p className="renew-confirm-warning">
              Current pending {formatCurrency(pending)} (Paid {formatCurrency(paid)}). It will carry if you renew without recording payment.
            </p>
          )}
          <div className="renew-confirm-choice">
            <span className="renew-choice-label">Is the renewal amount paid?</span>
            <div className="renew-choice-options">
              <label className={`renew-choice ${isRenewPaid ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name={`renew-paid-${customer.id}`}
                  checked={isRenewPaid}
                  onChange={() => setIsRenewPaid(true)}
                />
                Paid — {formatCurrency(amount)}
              </label>
              <label className={`renew-choice ${!isRenewPaid ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name={`renew-paid-${customer.id}`}
                  checked={!isRenewPaid}
                  onChange={() => setIsRenewPaid(false)}
                />
                Not paid — {formatCurrency(pending > 0 ? pending : amount)} due
              </label>
            </div>
          </div>
          <div className="renew-confirm-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setIsRenewConfirmOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleConfirmRenew}>
              Renew as {isRenewPaid ? 'Paid' : 'Pending'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerCard;
