import React, { useState, useEffect, useCallback } from 'react';
import { Download, Search, X, Calendar, Clock, RefreshCw, Banknote, Trash2, PlusCircle, Edit } from 'lucide-react';
import './CustomerHistoryModal.css';
import { apiRequest, getApiMessage } from '../api';
import { historyToCsv, downloadCsv } from '../utils/exportCsv';
import ConfirmDialog from './ConfirmDialog';

const formatCurrency = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const getActivityMessage = (item) => {
  if (item.message) return item.message;

  const amount = Number(item.amount || 0);
  const paidAmount = Number(item.paidAmount ?? amount);
  const dueAmount = Math.max(0, amount - paidAmount);

  switch (item.action) {
    case 'created':
      return dueAmount > 0
        ? `Customer added. ${formatCurrency(dueAmount)} marked due.`
        : 'Customer added and marked fully paid.';
    case 'renewed':
      return item.endDate
        ? `Subscription renewed until ${new Date(item.endDate).toLocaleDateString('en-IN')}.`
        : 'Subscription renewed.';
    case 'payment_recorded':
      return item.paymentAmount
        ? `Payment of ${formatCurrency(item.paymentAmount)} recorded.`
        : 'Payment recorded.';
    case 'deleted':
      return 'Customer record deleted.';
    case 'baseline_import':
      return 'Existing customer record imported from the previous data.';
    default:
      return 'Customer details updated.';
  }
};

const getDefaultDates = () => {
  const end = new Date();
  const start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
};

const CustomerHistoryModal = ({ isOpen, onClose, onSessionExpired }) => {
  const defaultDates = getDefaultDates();
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [startDate, setStartDate] = useState(defaultDates.startDate);
  const [endDate, setEndDate] = useState(defaultDates.endDate);

  const [history, setHistory] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, hasMore: false });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchHistoryPage = useCallback(async (pageNumber, { append = false } = {}) => {
    if (endDate < startDate) {
      setError('End date must be on or after the start date.');
      return;
    }

    setError('');
    if (pageNumber === 1 && !append) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const params = new URLSearchParams({
        page: String(pageNumber),
        limit: '20',
        search: searchQuery,
        action: actionFilter,
        startDate,
        endDate,
      });

      const response = await apiRequest(`/customers/history?${params}`);

      if (response.status === 401) {
        onSessionExpired?.();
        return;
      }

      if (!response.ok) {
        throw new Error(await getApiMessage(response, 'Unable to fetch customer history.'));
      }

      const data = await response.json();
      setHistory((prev) => (append ? [...prev, ...data.history] : data.history));
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching customer history:', error);
      setError(error.message || 'Unable to fetch customer history.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [actionFilter, endDate, onSessionExpired, searchQuery, startDate]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const timer = setTimeout(() => {
      fetchHistoryPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [isOpen, fetchHistoryPage]);

  if (!isOpen) return null;

  const handleLoadMore = () => {
    if (!pagination.hasMore || isLoadingMore) return;
    fetchHistoryPage(pagination.page + 1, { append: true });
  };

  const handleExportCsv = async () => {
    if (endDate < startDate) {
      setError('End date must be on or after the start date.');
      return;
    }

    setError('');
    setIsExporting(true);
    try {
      const params = new URLSearchParams({
        search: searchQuery,
        action: actionFilter,
        startDate,
        endDate,
      });

      const response = await apiRequest(`/customers/history/export?${params}`);

      if (response.status === 401) {
        onSessionExpired?.();
        return;
      }

      if (!response.ok) {
        throw new Error(await getApiMessage(response, 'Unable to export history.'));
      }

      const allHistory = await response.json();
      if (allHistory.length === 0) {
        alert('No history records to export.');
        return;
      }

      const csvText = historyToCsv(allHistory);
      const dateStamp = new Date().toISOString().split('T')[0];
      downloadCsv(csvText, `customer-history-3months-${dateStamp}.csv`);
    } catch (error) {
      console.error('Error exporting history CSV:', error);
      setError(error.message || 'Unable to export history CSV.');
      alert(error.message || 'Unable to export history CSV.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteActivity = async () => {
    if (!activityToDelete || isDeleting) return;

    setIsDeleting(true);
    setError('');
    try {
      const response = await apiRequest(`/customers/history/${activityToDelete._id}`, {
        method: 'DELETE',
      });

      if (response.status === 401) {
        onSessionExpired?.();
        return;
      }

      if (!response.ok) {
        throw new Error(await getApiMessage(response, 'Unable to delete activity log.'));
      }

      setHistory((currentHistory) => currentHistory.filter((item) => item._id !== activityToDelete._id));
      setPagination((currentPagination) => ({
        ...currentPagination,
        total: Math.max(0, currentPagination.total - 1),
      }));
      setActivityToDelete(null);
    } catch (requestError) {
      console.error('Error deleting customer activity:', requestError);
      setError(requestError.message || 'Unable to delete activity log.');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderActionBadge = (action) => {
    const badges = {
      created: { label: 'Created', icon: <PlusCircle size={12} />, className: 'created' },
      renewed: { label: 'Renewed', icon: <RefreshCw size={12} />, className: 'renewed' },
      payment_recorded: { label: 'Payment', icon: <Banknote size={12} />, className: 'payment_recorded' },
      updated: { label: 'Updated', icon: <Edit size={12} />, className: 'updated' },
      deleted: { label: 'Deleted', icon: <Trash2 size={12} />, className: 'deleted' },
      baseline_import: { label: 'Initial Record', icon: <Clock size={12} />, className: 'baseline_import' },
    };

    const b = badges[action] || { label: action, icon: null, className: '' };
    return (
      <span className={`action-badge ${b.className}`}>
        {b.icon}
        {b.label}
      </span>
    );
  };

  const totalPaymentsInView = history.reduce((sum, item) => {
    if (item.action === 'payment_recorded' && item.paymentAmount) {
      return sum + Number(item.paymentAmount);
    }
    return sum;
  }, 0);

  return (
    <div className="history-modal-overlay">
      <div className="history-modal-content" role="dialog" aria-modal="true" aria-labelledby="customer-history-title">
        <div className="history-modal-header">
          <h2 id="customer-history-title">3-Month Customer Activity Report</h2>
          <div className="history-modal-actions">
            <button
              type="button"
              className="history-export-btn"
              onClick={handleExportCsv}
              disabled={isExporting}
            >
              <Download size={16} />
              {isExporting ? 'Exporting...' : 'Export Report CSV'}
            </button>
            <button type="button" className="btn-icon" onClick={onClose} aria-label="Close report">
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="history-filters">
          <div className="history-search-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="history-search-input"
              placeholder="Search by customer name or mobile..."
              aria-label="Search customer activity"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="history-filter-select"
            aria-label="Filter by activity type"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="all">All Activity Types</option>
            <option value="created">Created</option>
            <option value="renewed">Renewed</option>
            <option value="payment_recorded">Payment Recorded</option>
            <option value="updated">Updated</option>
            <option value="deleted">Deleted</option>
          </select>

          <div className="history-date-group">
            <span>From:</span>
            <input
              type="date"
              className="history-date-input"
              aria-label="Activity start date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span>To:</span>
            <input
              type="date"
              className="history-date-input"
              aria-label="Activity end date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="history-summary-bar">
          <div className="history-summary-item">
            <span>Total Logged Activities:</span>
            <strong>{pagination.total}</strong>
          </div>
          {totalPaymentsInView > 0 && (
            <div className="history-summary-item" style={{ marginLeft: 'auto' }}>
              <span>Payments in View:</span>
              <strong style={{ color: '#60a5fa' }}>{formatCurrency(totalPaymentsInView)}</strong>
            </div>
          )}
        </div>

        {error && <p className="history-error" role="alert">{error}</p>}

        <div className="history-list-container">
          {isLoading ? (
            <div className="history-empty">Loading activity history...</div>
          ) : history.length === 0 ? (
            <div className="history-empty">No activity records found for the selected period.</div>
          ) : (
            <>
              {history.map((item) => (
                <div key={item._id} className="history-item-card">
                  <div className="history-item-top">
                    <div className="history-item-user">
                      {renderActionBadge(item.action)}
                      <span className="history-customer-name">{item.customerName}</span>
                      <span className="history-customer-phone">({item.customerMobile})</span>
                    </div>
                    <div className="history-item-actions">
                      <div className="history-timestamp">
                        <Clock size={13} />
                        {new Date(item.timestamp).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      <button
                        type="button"
                        className="history-delete-btn"
                        onClick={() => setActivityToDelete(item)}
                        aria-label={`Delete ${item.action} activity for ${item.customerName}`}
                        title="Delete activity log"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="history-item-details">
                    {item.plan && (
                      <div className="history-detail-chip">
                        <span>Plan:</span>
                        <strong>{item.plan}</strong>
                        {item.planType && (
                          <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>({item.planType})</span>
                        )}
                      </div>
                    )}

                    {item.paymentAmount ? (
                      <div className="history-detail-chip">
                        <span>Payment Received:</span>
                        <strong style={{ color: '#60a5fa' }}>{formatCurrency(item.paymentAmount)}</strong>
                      </div>
                    ) : item.amount ? (
                      <div className="history-detail-chip">
                        <span>Plan Amount:</span>
                        <strong>{formatCurrency(item.amount)}</strong>
                      </div>
                    ) : null}

                    {item.startDate && item.endDate && (
                      <div className="history-detail-chip">
                        <Calendar size={13} style={{ marginRight: 2 }} />
                        <span>
                          {new Date(item.startDate).toLocaleDateString('en-IN')} –{' '}
                          {new Date(item.endDate).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="history-item-message">{getActivityMessage(item)}</p>

                  {item.notes && (
                    <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }}>
                      Notes: {item.notes}
                    </div>
                  )}
                </div>
              ))}

              {pagination.hasMore && (
                <button
                  type="button"
                  className="history-load-more"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? 'Loading more...' : 'Load more history'}
                </button>
              )}
            </>
          )}
        </div>

        <ConfirmDialog
          isOpen={Boolean(activityToDelete)}
          title="Delete activity log?"
          message="This removes only this report entry. It does not undo or delete the customer, subscription, or payment."
          confirmLabel={isDeleting ? 'Deleting...' : 'Delete log'}
          onConfirm={handleDeleteActivity}
          onCancel={() => setActivityToDelete(null)}
        />
      </div>
    </div>
  );
};

export default CustomerHistoryModal;
