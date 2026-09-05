import React, { useState } from 'react';
import { Clock, Download, LogOut, Menu, Search, UserRound, Users, X } from 'lucide-react';
import './Header.css';

const Header = ({ searchQuery, setSearchQuery, filter, setFilter, currentUser, onLogout, onManageUsers, onExportCsv, onOpenHistory }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  const handleFilterClick = (newFilter) => {
    setFilter(newFilter);
    setIsMenuOpen(false);
  };

  const toggleFilterMenu = () => {
    setIsMenuOpen((isOpen) => !isOpen);
    setIsAccountMenuOpen(false);
  };

  const toggleAccountMenu = () => {
    setIsAccountMenuOpen((isOpen) => !isOpen);
    setIsMenuOpen(false);
  };

  return (
    <header className="header glass">
      <div className="header-top">
        <button type="button" className="btn-icon" onClick={toggleFilterMenu} aria-label="Open customer filters">
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h1 className="header-title">Customers</h1>
        <button
          type="button"
          className="btn-icon"
          onClick={toggleAccountMenu}
          aria-label="Open account menu"
          aria-expanded={isAccountMenuOpen}
        >
          <UserRound size={22} />
        </button>
      </div>
      
      {isMenuOpen && (
        <div className="submenu-dropdown glass-panel">
          <ul>
            <li className={filter === 'all' ? 'active' : ''} onClick={() => handleFilterClick('all')}>All Customers</li>
            <li className={filter === 'lunch' ? 'active' : ''} onClick={() => handleFilterClick('lunch')}>Lunch Only</li>
            <li className={filter === 'dinner' ? 'active' : ''} onClick={() => handleFilterClick('dinner')}>Dinner Only</li>
            <li className={filter === 'both' ? 'active' : ''} onClick={() => handleFilterClick('both')}>Both Meals</li>
            <li className={filter === 'expiring' ? 'active' : ''} onClick={() => handleFilterClick('expiring')}>Expiring soon (&lt;5 days)</li>
            <li className={filter === 'pending' ? 'active' : ''} onClick={() => handleFilterClick('pending')}>Pending Payments</li>
            <li className={filter === 'inactive' ? 'active' : ''} onClick={() => handleFilterClick('inactive')}>Inactive</li>
            <li
              className="submenu-history"
              onClick={() => {
                setIsMenuOpen(false);
                onOpenHistory();
              }}
            >
              <Clock size={16} />
              3-Month Activity Report
            </li>
            <li
              className="submenu-export"
              onClick={() => {
                setIsMenuOpen(false);
                onExportCsv();
              }}
            >
              <Download size={16} />
              Export CSV
            </li>
          </ul>
        </div>
      )}

      {isAccountMenuOpen && (
        <div className="account-dropdown glass-panel">
          <div className="account-summary">
            <strong>{currentUser.name}</strong>
            <span>{currentUser.role}</span>
          </div>
          {currentUser.role === 'admin' && (
            <button
              type="button"
              className="account-action"
              onClick={() => {
                setIsAccountMenuOpen(false);
                onManageUsers();
              }}
            >
              <Users size={17} />
              Manage access
            </button>
          )}
          <button
            type="button"
            className="account-action account-logout"
            onClick={() => {
              setIsAccountMenuOpen(false);
              onLogout();
            }}
          >
            <LogOut size={17} />
            Log out
          </button>
        </div>
      )}
      
      <div className="search-container">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            className="input-field search-input" 
            placeholder="Search customers..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
