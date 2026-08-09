import { useEffect, useState } from 'react';
import { Key, UserCheck, UserPlus, UserX, X } from 'lucide-react';
import { apiRequest, getApiMessage } from '../api';
import './UserManagementModal.css';
import PasswordField from './PasswordField';

const emptyStaffForm = { name: '', email: '', password: '' };

const sortUsers = (users) => [...users].sort((firstUser, secondUser) => {
  if (firstUser.role !== secondUser.role) {
    return firstUser.role === 'admin' ? -1 : 1;
  }

  return firstUser.name.localeCompare(secondUser.name);
});

const UserManagementModal = ({ isOpen, onClose, onSessionExpired }) => {
  const [users, setUsers] = useState([]);
  const [staffForm, setStaffForm] = useState(emptyStaffForm);
  const [resetUserId, setResetUserId] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    let isCancelled = false;

    const loadUsers = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await apiRequest('/auth/users');

        if (response.status === 401) {
          onSessionExpired();
          return;
        }

        if (!response.ok) {
          throw new Error(await getApiMessage(response, 'Unable to load users.'));
        }

        const { users: loadedUsers } = await response.json();
        if (!isCancelled) {
          setUsers(sortUsers(loadedUsers));
        }
      } catch (requestError) {
        if (!isCancelled) {
          setError(requestError.message || 'Unable to load users.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadUsers();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, onSessionExpired]);

  if (!isOpen) {
    return null;
  }

  const updateUser = async (userId, changes) => {
    setError('');
    setSuccess('');
    setUpdatingUserId(userId);

    try {
      const response = await apiRequest(`/auth/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(changes),
      });

      if (response.status === 401) {
        onSessionExpired();
        return false;
      }

      if (!response.ok) {
        throw new Error(await getApiMessage(response, 'Unable to update the user.'));
      }

      const { user } = await response.json();
      setUsers((currentUsers) => sortUsers(currentUsers.map((currentUser) => (
        currentUser.id === user.id ? user : currentUser
      ))));
      return true;
    } catch (requestError) {
      setError(requestError.message || 'Unable to update the user.');
      return false;
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleCreateStaff = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsCreating(true);

    try {
      const response = await apiRequest('/auth/users', {
        method: 'POST',
        body: JSON.stringify(staffForm),
      });

      if (response.status === 401) {
        onSessionExpired();
        return;
      }

      if (!response.ok) {
        throw new Error(await getApiMessage(response, 'Unable to create the staff account.'));
      }

      const { user } = await response.json();
      setUsers((currentUsers) => sortUsers([...currentUsers, user]));
      setStaffForm(emptyStaffForm);
      setSuccess(`${user.name} can now sign in.`);
    } catch (requestError) {
      setError(requestError.message || 'Unable to create the staff account.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();

    if (!resetUserId) {
      return;
    }

    const didUpdate = await updateUser(resetUserId, { password: resetPassword });
    if (didUpdate) {
      setResetUserId(null);
      setResetPassword('');
      setSuccess('Password updated.');
    }
  };

  const closeModal = () => {
    setError('');
    setSuccess('');
    setResetUserId(null);
    setResetPassword('');
    onClose();
  };

  return (
    <div className="user-management-overlay" role="presentation">
      <section className="user-management-modal glass-panel" role="dialog" aria-modal="true" aria-labelledby="user-management-title">
        <div className="user-management-header">
          <div>
            <p className="user-management-eyebrow">Admin only</p>
            <h2 id="user-management-title">Manage access</h2>
          </div>
          <button type="button" className="btn-icon" onClick={closeModal} aria-label="Close access management">
            <X size={22} />
          </button>
        </div>

        <form className="staff-create-form" onSubmit={handleCreateStaff}>
          <h3>Add staff account</h3>
          <div className="staff-form-grid">
            <label>
              <span>Name</span>
              <input
                required
                type="text"
                value={staffForm.name}
                onChange={(event) => setStaffForm((currentForm) => ({ ...currentForm, name: event.target.value }))}
                placeholder="Staff member"
              />
            </label>
            <label>
              <span>Email</span>
              <input
                required
                type="email"
                autoComplete="off"
                value={staffForm.email}
                onChange={(event) => setStaffForm((currentForm) => ({ ...currentForm, email: event.target.value }))}
                placeholder="staff@example.com"
              />
            </label>
          </div>
          <label className="staff-password-field">
            <span>Temporary password</span>
            <PasswordField
              required
              minLength="8"
              value={staffForm.password}
              onChange={(event) => setStaffForm((currentForm) => ({ ...currentForm, password: event.target.value }))}
              placeholder="At least 8 characters"
            />
          </label>
          <button className="btn btn-primary staff-create-button" type="submit" disabled={isCreating}>
            <UserPlus size={17} aria-hidden="true" />
            {isCreating ? 'Adding staff...' : 'Add staff'}
          </button>
        </form>

        {error && <p className="access-message access-error" role="alert">{error}</p>}
        {success && <p className="access-message access-success" role="status">{success}</p>}

        <div className="access-list-heading">
          <h3>Accounts</h3>
          <span>{users.length}</span>
        </div>

        {isLoading ? (
          <p className="access-empty-state">Loading accounts...</p>
        ) : (
          <ul className="access-user-list">
            {users.map((user) => {
              const isStaff = user.role === 'staff';
              const isUpdating = updatingUserId === user.id;

              return (
                <li key={user.id} className="access-user-card">
                  <div className="access-user-summary">
                    <div>
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </div>
                    <div className="access-user-badges">
                      <span className={`access-role access-role-${user.role}`}>{user.role}</span>
                      <span className={`access-status ${user.isActive ? 'is-active' : 'is-disabled'}`}>
                        {user.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  </div>

                  {isStaff && (
                    <div className="access-user-actions">
                      <button
                        type="button"
                        onClick={() => updateUser(user.id, { isActive: !user.isActive })}
                        disabled={isUpdating}
                      >
                        {user.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                        {user.isActive ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setResetUserId(user.id);
                          setResetPassword('');
                          setError('');
                          setSuccess('');
                        }}
                        disabled={isUpdating}
                      >
                        <Key size={15} />
                        Reset password
                      </button>
                    </div>
                  )}

                  {isStaff && resetUserId === user.id && (
                    <form className="password-reset-form" onSubmit={handleResetPassword}>
                      <label>
                        <span>New password</span>
                        <PasswordField
                          required
                          minLength="8"
                          value={resetPassword}
                          onChange={(event) => setResetPassword(event.target.value)}
                          placeholder="At least 8 characters"
                        />
                      </label>
                      <div>
                        <button className="btn btn-primary" type="submit" disabled={isUpdating}>
                          Save password
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setResetUserId(null);
                            setResetPassword('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};

export default UserManagementModal;
