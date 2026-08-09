import { useState, useEffect } from 'react';
import Header from './components/Header';
import DashboardStats from './components/DashboardStats';
import CustomerList from './components/CustomerList';
import FloatingActionButton from './components/FloatingActionButton';
import AddCustomerModal from './components/AddCustomerModal';
import LoginPage from './components/LoginPage';
import UserManagementModal from './components/UserManagementModal';
import PaymentModal from './components/PaymentModal';
import { apiRequest, getApiMessage } from './api';
import { customersToCsv, downloadCsv } from './utils/exportCsv';

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState(null);

  const handleSessionExpired = () => {
    setCurrentUser(null);
    setCustomers([]);
    setIsModalOpen(false);
    setCustomerToEdit(null);
    setIsUserManagementOpen(false);
    setPaymentCustomer(null);
  };

  const fetchCustomers = async () => {
    try {
      const response = await apiRequest('/customers');

      if (response.status === 401) {
        handleSessionExpired();
        return;
      }

      if (!response.ok) {
        throw new Error(await getApiMessage(response, 'Unable to fetch customers.'));
      }

      const data = await response.json();
      const formattedData = data.map((customer) => ({ ...customer, id: customer._id }));
      setCustomers(formattedData);
    } catch (error) {
      console.error('Error fetching customers:', error);
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
    if (currentUser) {
      fetchCustomers();
    }
  }, [currentUser]);

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
    return savedCustomer;
  };

  const handleExportCsv = () => {
    if (customers.length === 0) {
      alert('No customers to export.');
      return;
    }

    const csvText = customersToCsv(customers);
    const dateStamp = new Date().toISOString().split('T')[0];
    downloadCsv(csvText, `customers-${dateStamp}.csv`);
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

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchQuery.toLowerCase()) || customer.mobile.includes(searchQuery);
    
    let matchesFilter = true;
    if (filter === 'pending') {
      const amount = Number(customer.amount) || 0;
      const paid = Number(customer.paidAmount ?? amount) || 0;
      matchesFilter = paid < amount;
    } else if (filter === 'inactive') {
      matchesFilter = new Date(customer.endDate) < new Date();
    } else if (filter === 'expiring') {
      const end = new Date(customer.endDate);
      end.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
      matchesFilter = daysLeft >= 0 && daysLeft < 5;
    } else if (filter !== 'all') {
      matchesFilter = customer.planType === filter;
    }
    
    return matchesSearch && matchesFilter;
  });

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

      <DashboardStats customers={customers} />
      
      <main>
        <CustomerList 
          customers={filteredCustomers} 
          onDelete={handleDeleteCustomer}
          onEdit={(customer) => {
            setCustomerToEdit(customer);
            setIsModalOpen(true);
          }}
          onRenew={handleRenewCustomer}
          onRecordPayment={setPaymentCustomer}
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
