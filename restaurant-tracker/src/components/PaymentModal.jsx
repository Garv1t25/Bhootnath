import { useEffect, useState } from 'react';
import { CheckCircle2, IndianRupee, X } from 'lucide-react';
import './PaymentModal.css';

const formatCurrency = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const PaymentModal = ({ customer, isOpen, onClose, onRecordPayment }) => {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !customer) {
      return;
    }

    const pending = Math.max(0, Number(customer.amount || 0) - Number(customer.paidAmount ?? customer.amount ?? 0));
    setAmount(pending > 0 ? String(pending) : '');
    setDate(formatLocalDate(new Date()));
    setError('');
  }, [isOpen, customer]);

  if (!isOpen || !customer) {
    return null;
  }

  const paid = Number(customer.paidAmount ?? customer.amount ?? 0);
  const total = Number(customer.amount || 0);
  const pending = Math.max(0, total - paid);
  const payments = customer.payments || [];

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onRecordPayment(customer.id, { amount: numericAmount, date });
      onClose();
    } catch (requestError) {
      setError(requestError.message || 'Unable to record the payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel">
        <div className="modal-header">
          <h2>Record Payment</h2>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close payment form">
            <X size={24} />
          </button>
        </div>

        <div className="payment-summary">
          <div className="payment-summary-item">
            <span>Customer</span>
            <strong>{customer.name}</strong>
          </div>
          <div className="payment-summary-item">
            <span>Plan</span>
            <strong>{customer.plan}</strong>
          </div>
          <div className="payment-summary-grid">
            <div className="payment-summary-item">
              <span>Amount</span>
              <strong>{formatCurrency(total)}</strong>
            </div>
            <div className="payment-summary-item">
              <span>Paid</span>
              <strong style={{ color: 'var(--success)' }}>{formatCurrency(paid)}</strong>
            </div>
            <div className="payment-summary-item">
              <span>Pending</span>
              <strong style={{ color: pending > 0 ? 'var(--warning)' : 'var(--success)' }}>{formatCurrency(pending)}</strong>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="payment-form">
          <div className="form-row">
            <div className="form-group">
              <label>Amount Received</label>
              <div className="amount-input-wrapper">
                <IndianRupee size={16} />
                <input
                  required
                  type="number"
                  min="1"
                  className="input-field"
                  placeholder="0"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="form-group">
              <label>Date</label>
              <input
                required
                type="date"
                className="input-field"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
          </div>

          {error && <p className="payment-error" role="alert">{error}</p>}

          <button type="submit" className="btn btn-primary submit-btn" disabled={isSubmitting}>
            <CheckCircle2 size={17} />
            {isSubmitting ? 'Saving...' : `Record ${formatCurrency(amount)}`}
          </button>
        </form>

        {payments.length > 0 && (
          <div className="payment-history">
            <h3>Payment history</h3>
            <ul>
              {payments.map((payment, index) => (
                <li key={index}>
                  <span>{new Date(payment.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <strong>{formatCurrency(payment.amount)}</strong>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;
