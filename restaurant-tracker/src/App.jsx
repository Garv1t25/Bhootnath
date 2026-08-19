import { useState, useEffect } from 'react';
import Header from './components/Header';
import DashboardStats from './components/DashboardStats';
import CustomerList from './components/CustomerList';
import FloatingActionButton from './components/FloatingActionButton';
import AddCustomerModal from './components/AddCustomerModal';
import LoginPage from './components/LoginPage';
import UserManagementModal from './components/UserManagementModal';
import PaymentModal from './components/PaymentModal';
import PrivacyPolicy from './components/PrivacyPolicy';
import { apiRequest, getApiMessage } from './api';
import { customersToCsv, downloadCsv } from './utils/exportCsv';

const PAGE_SIZE = 20;

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 0, limit: PAGE_SIZE, total: 0, hasMore: false });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState(null);

  const handleSessionExpired = () => {
    setCurrentUser(null);
    setCustomers([]);
    setStats(null);
    setIsModalOpen(false);
    setCustomerToEdit(null);
    setIsUserManagementOpen(false);
    setPaymentCustomer(null);
  };

  const fetchCustomersPage = async (pageNumber, { append = false } = {}) => {
    try {
      const params = new URLSearchParams({
        page: String(pageNumber),
        limit: String(PAGE_SIZE),
        search: searchQuery,
        filter,
      });
      const response = await apiRequest(`/customers?${params}`);

      if (response.status === 401) {
        handleSessionExpired();
        return;
      }

      if (!response.ok) {
        throw new Error(await getApiMessage(response, 'Unable to fetch customers.'));
      }

      const data = await response.json();
      const formattedData = data.customers.map((customer) => ({ ...customer, id: customer._id }));
      setCustomers((currentCustomers) => append ? [...currentCustomers, ...formattedData] : formattedData);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiRequest('/customers/stats');

      if (response.status === 401) {
        handleSessionExpired();
        return;
      }

      if (!response.ok) {
        return;
      }

      const { stats: loadedStats } = await response.json();
      setStats(loadedStats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const response = await apiRequest('/auth/me');

        if (!response.ok) {
          return;
        }

        const { user } = await response.json();
        if (isMounted) {
          setCurrentUser(user);
        }
      } catch (error) {
        console.error('Error restoring session:', error);
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      return undefined;
    }

    const debounceTimer = setTimeout(() => {
      fetchCustomersPage(1);
      fetchStats();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, filter, currentUser]);

  const handleAddCustomer = async (newCustomer) => {
    try {
      const response = await apiRequest('/customers', {
        method: 'POST',
        body: JSON.stringify(newCustomer)
      });

      if (response.status === 401) {
        handleSessionExpired();
        return;
      }

      if (!response.ok) {
        throw new Error(await getApiMessage(response, 'Unable to add customer.'));
      }

      const savedCustomer = await response.json();
      savedCustomer.id = savedCustomer._id;
      setCustomers((currentCustomers) => [savedCustomer, ...currentCustomers]);
      fetchStats();
    } catch (error) {
      console.error('Error adding customer:', error);
      alert(error.message || 'Unable to add customer.');
    }
  };

  const handleEditCustomer = async (updatedCustomer) => {
    try {
      const response = await apiRequest(`/customers/${updatedCustomer.id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedCustomer)
      });

      if (response.status === 401) {
        handleSessionExpired();
        return;
      }

      if (!response.ok) {
        throw new Error(await getApiMessage(response, 'Unable to update customer.'));
      }

      const savedCustomer = await response.json();
      savedCustomer.id = savedCustomer._id;
      setCustomers((currentCustomers) => currentCustomers.map((customer) => (
        customer.id === savedCustomer.id ? savedCustomer : customer
      )));
      fetchStats();
    } catch (error) {
      console.error('Error updating customer:', error);
      alert(error.message || 'Unable to update customer.');
    }
  };

  const handleRenewCustomer = async (renewedCustomer) => {
    // Renew is just an edit with new dates
    await handleEditCustomer(renewedCustomer);
  };

  const handleDeleteCustomer = async (id) => {
    try {
      const response = await apiRequest(`/customers/${id}`, {
        method: 'DELETE'
      });

      if (response.status === 401) {
        handleSessionExpired();
        return;
      }

      if (!response.ok) {
        throw new Error(await getApiMessage(response, 'Unable to delete customer.'));
      }

      setCustomers((currentCustomers) => currentCustomers.filter((customer) => customer.id !== id));
      fetchStats();
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert(error.message || 'Unable to delete customer.');
    }
  };

  const handleRecordPayment = async (id, payment) => {
    const response = await apiRequest(`/customers/${id}/payments`, {
      method: 'POST',
      body: JSON.stringify(payment)
    });

    if (response.status === 401) {
      handleSessionExpired();
      throw new Error('Session expired.');
    }

    if (!response.ok) {
      throw new Error(await getApiMessage(response, 'Unable to record payment.'));
    }

    const savedCustomer = await response.json();
    savedCustomer.id = savedCustomer._id;
    setCustomers((currentCustomers) => currentCustomers.map((customer) => (
      customer.id === savedCustomer.id ? savedCustomer : customer
    )));
    fetchStats();
    return savedCustomer;
  };

  const handleExportCsv = async () => {
    try {
      const response = await apiRequest('/customers/export');

      if (response.status === 401) {
        handleSessionExpired();
        return;
      }

      if (!response.ok) {
        throw new Error(await getApiMessage(response, 'Unable to export customers.'));
      }

      const allCustomers = await response.json();

      if (allCustomers.length === 0) {
        alert('No customers to export.');
        return;
      }

      const formattedCustomers = allCustomers.map((customer) => ({ ...customer, id: customer._id }));
      const csvText = customersToCsv(formattedCustomers);
      const dateStamp = new Date().toISOString().split('T')[0];
      downloadCsv(csvText, `customers-${dateStamp}.csv`);
    } catch (error) {
      console.error('Error exporting customers:', error);
      alert(error.message || 'Unable to export customers.');
    }
  };

  const handleLoadMore = async () => {
    if (!pagination.hasMore || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    await fetchCustomersPage(pagination.page + 1, { append: true });
    setIsLoadingMore(false);
  };

  const handleLogout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      handleSessionExpired();
    }
  };

  if (window.location.pathname === '/privacy-policy') {
    return <PrivacyPolicy />;
  }

  if (isAuthLoading) {
    return <div className="auth-loading">Checking your session...</div>;
  }

  if (!currentUser) {
    return <LoginPage onLogin={setCurrentUser} />;
  }

  return (
    <div className="app-container">
      <Header 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
        filter={filter}
        setFilter={setFilter}
        currentUser={currentUser}
        onLogout={handleLogout}
        onManageUsers={() => setIsUserManagementOpen(true)}
        onExportCsv={handleExportCsv}
      />

      <DashboardStats stats={stats} />
      
      <main>
        <CustomerList 
          customers={customers} 
          onDelete={handleDeleteCustomer}
          onEdit={(customer) => {
            setCustomerToEdit(customer);
            setIsModalOpen(true);
          }}
          onRenew={handleRenewCustomer}
          onRecordPayment={setPaymentCustomer}
          onLoadMore={handleLoadMore}
          hasMore={pagination.hasMore}
          isLoadingMore={isLoadingMore}
        />
      </main>

      <FloatingActionButton onClick={() => {
        setCustomerToEdit(null);
        setIsModalOpen(true);
      }} />
      
      <AddCustomerModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onAdd={handleAddCustomer} 
        onEdit={handleEditCustomer}
        customerToEdit={customerToEdit}
        customers={customers}
      />

      <PaymentModal
        customer={paymentCustomer}
        isOpen={Boolean(paymentCustomer)}
        onClose={() => setPaymentCustomer(null)}
        onRecordPayment={handleRecordPayment}
      />

      {currentUser.role === 'admin' && (
        <UserManagementModal
          isOpen={isUserManagementOpen}
          onClose={() => setIsUserManagementOpen(false)}
          onSessionExpired={handleSessionExpired}
        />
      )}
    </div>
  );
}

export default App;
