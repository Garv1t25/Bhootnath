import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import './AddCustomerModal.css';
import ConfirmDialog from './ConfirmDialog';
import DateField from './DateField';

const PLAN_TEMPLATES = [
  { label: 'Monthly Lunch', plan: 'Monthly Lunch', planType: 'lunch', amount: '2100', duration: 30 },
  { label: 'Monthly Dinner', plan: 'Monthly Dinner', planType: 'dinner', amount: '2100', duration: 30 },
  { label: 'Monthly Both', plan: 'Monthly Both', planType: 'both', amount: '4200', duration: 30 },
  
];

const normalizeMobile = (mobile) => {
  let digits = String(mobile ?? '').replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits;
};

const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const toDisplayDate = (isoDate) => {
  if (!isoDate) return '';
  const dateStr = isoDate.includes('T') ? isoDate.split('T')[0] : isoDate;
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
};

const parseDisplayDate = (display) => {
  if (!display) return null;
  const match = String(display).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const day = match[1].padStart(2, '0');
  const month = match[2].padStart(2, '0');
  const year = match[3];
  const date = new Date(`${year}-${month}-${day}T00:00:00`);
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() + 1 !== Number(month) ||
    date.getDate() !== Number(day)
  ) {
    return null;
  }
  return `${year}-${month}-${day}`;
};

const AddCustomerModal = ({ isOpen, onClose, onAdd, onEdit, customerToEdit, customers = [] }) => {
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    plan: '',
    planType: 'both',
    amount: '',
    startDate: '',
    endDate: '',
    notes: '',
    paidAmount: ''
  });
  const [isMobileBlurred, setIsMobileBlurred] = useState(false);
  const [isDuplicateConfirmOpen, setIsDuplicateConfirmOpen] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (customerToEdit) {
      const formatted = { ...customerToEdit };
      formatted.startDate = toDisplayDate(formatted.startDate);
      formatted.endDate = toDisplayDate(formatted.endDate);
      formatted.paidAmount = customerToEdit.paidAmount ?? customerToEdit.amount;
      setFormData(formatted);
    } else {
      setFormData({ name: '', mobile: '', plan: '', planType: 'both', amount: '', startDate: '', endDate: '', notes: '', paidAmount: '' });
    }
    setIsMobileBlurred(false);
    setFormError('');
  }, [customerToEdit, isOpen]);

  const duplicateCustomer = useMemo(() => {
    const normalized = normalizeMobile(formData.mobile);
    if (normalized.length < 7) {
      return null;
    }

    const variants = new Set([normalized, `91${normalized}`]);
    return customers.find((customer) => {
      const sameNumber = variants.has(normalizeMobile(customer.mobile));
      const isSelf = customerToEdit && customer.id === customerToEdit.id;
      return sameNumber && !isSelf;
    }) || null;
  }, [customers, formData.mobile, customerToEdit]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFormError('');
  };

  const validateForm = () => {
    const name = String(formData.name ?? '').trim();
    if (!name) {
      return 'Name is required.';
    }
    if (name.length > 25) {
      return 'Name must not be longer than 25 characters.';
    }

    const digits = normalizeMobile(formData.mobile);
    if (digits.length !== 10) {
      return 'Mobile number must be exactly 10 digits.';
    }

    if (!parseDisplayDate(formData.startDate)) {
      return 'Start date must be in dd/mm/yyyy format.';
    }

    if (!parseDisplayDate(formData.endDate)) {
      return 'End date must be in dd/mm/yyyy format.';
    }

    return null;
  };

  const handleTemplateSelect = (template) => {
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + template.duration);

    setFormData(prev => ({
      ...prev,
      plan: template.plan,
      planType: template.planType,
      amount: template.amount,
      startDate: toDisplayDate(formatLocalDate(today)),
      endDate: toDisplayDate(formatLocalDate(endDate)),
    }));
    setFormError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }

    const payload = {
      ...formData,
      name: String(formData.name).trim(),
      mobile: normalizeMobile(formData.mobile),
      startDate: parseDisplayDate(formData.startDate),
      endDate: parseDisplayDate(formData.endDate),
    };

    if (duplicateCustomer) {
      setIsDuplicateConfirmOpen(true);
      return;
    }

    if (customerToEdit) {
      onEdit(payload);
    } else {
      onAdd(payload);
    }
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className={`modal-content glass-panel ${isOpen ? 'open' : ''}`}>
        <div className="modal-header">
          <h2>{customerToEdit ? 'Edit Customer' : 'Add Customer'}</h2>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        {/* Plan Templates */}
        {!customerToEdit && (
          <div className="plan-templates">
            <span className="templates-label">Quick Fill:</span>
            <div className="templates-list">
              {PLAN_TEMPLATES.map((template, index) => (
                <button
                  key={index}
                  type="button"
                  className="template-chip"
                  onClick={() => handleTemplateSelect(template)}
                >
                  {template.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Full Name</label>
            <input required type="text" name="name" className="input-field" placeholder="John Doe" maxLength={25} value={formData.name} onChange={handleChange} />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', alignSelf: 'flex-end' }}>{String(formData.name ?? '').length}/25</span>
          </div>
          
          <div className="form-group">
            <label>Mobile Number</label>
            <input
              required
              type="tel"
              name="mobile"
              className="input-field"
              placeholder="9876543210"
              maxLength={10}
              value={formData.mobile}
              onChange={(e) => {
                setIsMobileBlurred(false);
                const sanitized = e.target.value.replace(/\D/g, '').slice(0, 10);
                setFormData(prev => ({ ...prev, mobile: sanitized }));
                setFormError('');
              }}
              onBlur={() => setIsMobileBlurred(true)}
            />
            {isMobileBlurred && formData.mobile.length !== 10 && (
              <p className="duplicate-warning" role="alert">
                Mobile number must be exactly 10 digits.
              </p>
            )}
            {isMobileBlurred && formData.mobile.length === 10 && duplicateCustomer && (
              <p className="duplicate-warning" role="alert">
                This number is already used by {duplicateCustomer.name} ({duplicateCustomer.plan}).
              </p>
            )}
          </div>
          
          <div className="form-group">
            <label>Plan Details</label>
            <input required type="text" name="plan" className="input-field" placeholder="e.g. Monthly Premium" value={formData.plan} onChange={handleChange} />
          </div>
          
          <div className="form-group">
            <label>Plan Type</label>
            <select name="planType" className="input-field" value={formData.planType} onChange={handleChange}>
              <option value="both">Both (Lunch & Dinner)</option>
              <option value="lunch">Lunch Only</option>
              <option value="dinner">Dinner Only</option>
            </select>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Amount</label>
              <input required type="number" min="1" name="amount" className="input-field" placeholder="1500" value={formData.amount} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Paid Amount</label>
              <input type="number" min="0" name="paidAmount" className="input-field" placeholder="0" value={formData.paidAmount} onChange={handleChange} />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Start Date</label>
              <DateField name="startDate" value={formData.startDate} onChange={handleChange} />
            </div>
            
            <div className="form-group">
              <label>End Date</label>
              <DateField name="endDate" value={formData.endDate} onChange={handleChange} />
            </div>
          </div>
          
          <div className="form-group">
            <label>Notes</label>
            <textarea name="notes" className="input-field" placeholder="Any additional notes..." value={formData.notes} onChange={handleChange} rows="3" style={{ resize: 'vertical' }}></textarea>
          </div>
          
          {formError && (
            <p className="form-error" role="alert">{formError}</p>
          )}

          <button type="submit" className="btn btn-primary submit-btn">
            {customerToEdit ? 'Update Customer' : 'Save Customer'}
          </button>
        </form>
      </div>

      <ConfirmDialog
        isOpen={isDuplicateConfirmOpen}
        title="Duplicate number"
        message={`This mobile number is already used by ${duplicateCustomer?.name} (${duplicateCustomer?.plan}). You cannot save a customer with the same number.`}
        confirmLabel="OK"
        danger={false}
        showCancel={false}
        onConfirm={() => setIsDuplicateConfirmOpen(false)}
        onCancel={() => setIsDuplicateConfirmOpen(false)}
      />
    </div>
  );
};

export default AddCustomerModal;
