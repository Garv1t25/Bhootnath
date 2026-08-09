import React from 'react';
import CustomerCard from './CustomerCard';

const CustomerList = ({ customers, onDelete, onEdit, onRenew, onRecordPayment, onLoadMore, hasMore, isLoadingMore }) => {
  if (customers.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
        <p>No customers found.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>
      {customers.map((customer) => (
        <CustomerCard key={customer.id} customer={customer} onDelete={onDelete} onEdit={onEdit} onRenew={onRenew} onRecordPayment={onRecordPayment} />
      ))}
      {hasMore && (
        <button
          type="button"
          className="load-more-btn"
          onClick={onLoadMore}
          disabled={isLoadingMore}
        >
          {isLoadingMore ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  );
};

export default CustomerList;
