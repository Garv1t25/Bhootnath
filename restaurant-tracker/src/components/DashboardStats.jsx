import React, { useState } from 'react';
import { Users, UserCheck, AlertTriangle, UserX, IndianRupee, ChevronDown, Wallet } from 'lucide-react';
import './DashboardStats.css';

const DashboardStats = ({ customers }) => {
  const [isRevenueBreakdownOpen, setIsRevenueBreakdownOpen] = useState(false);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stats = customers.reduce((acc, customer) => {
    const endDate = new Date(customer.endDate);
    endDate.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

    if (daysLeft >= 0) {
      acc.active++;
      const amount = Number(customer.amount) || 0;
      const paidAmount = Number(customer.paidAmount ?? amount) || 0;
      const planName = String(customer.plan ?? '').trim() || 'Unspecified plan';

      acc.activeRevenue += amount;
      acc.totalPending += Math.max(0, amount - paidAmount);
      const planStats = acc.activeRevenueByPlan[planName] || { subscriptions: 0, totalAmount: 0 };
      planStats.subscriptions++;
      planStats.totalAmount += amount;
      acc.activeRevenueByPlan[planName] = planStats;
    } else {
      acc.expired++;
      const amount = Number(customer.amount) || 0;
      const paidAmount = Number(customer.paidAmount ?? amount) || 0;
      acc.totalPending += Math.max(0, amount - paidAmount);
    }

    if (daysLeft >= 0 && daysLeft <= 3) {
      acc.expiringSoon++;
    }

    return acc;
  }, { active: 0, expired: 0, expiringSoon: 0, activeRevenue: 0, totalPending: 0, activeRevenueByPlan: Object.create(null) });

  const planRevenue = Object.entries(stats.activeRevenueByPlan)
    .sort(([, firstPlan], [, secondPlan]) => secondPlan.totalAmount - firstPlan.totalAmount);
  const formatCurrency = (amount) => `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  const statCards = [
    {
      icon: <Users size={18} />,
      label: 'Total',
      value: customers.length,
      color: 'var(--accent-primary)',
      bgColor: 'rgba(139, 92, 246, 0.12)',
      borderColor: 'rgba(139, 92, 246, 0.25)'
    },
    {
      icon: <UserCheck size={18} />,
      label: 'Active',
      value: stats.active,
      color: 'var(--success)',
      bgColor: 'rgba(16, 185, 129, 0.12)',
      borderColor: 'rgba(16, 185, 129, 0.25)'
    },
    {
      icon: <AlertTriangle size={18} />,
      label: 'Expiring',
      value: stats.expiringSoon,
      color: 'var(--warning)',
      bgColor: 'rgba(245, 158, 11, 0.12)',
      borderColor: 'rgba(245, 158, 11, 0.25)'
    },
    {
      icon: <UserX size={18} />,
      label: 'Expired',
      value: stats.expired,
      color: 'var(--danger)',
      bgColor: 'rgba(239, 68, 68, 0.12)',
      borderColor: 'rgba(239, 68, 68, 0.25)'
    },
  ];

  return (
    <div className="dashboard-stats">
      <div className="stats-grid">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="stat-card"
            style={{
              background: stat.bgColor,
              border: `1px solid ${stat.borderColor}`,
            }}
          >
            <div className="stat-icon" style={{ color: stat.color }}>
              {stat.icon}
            </div>
            <div className="stat-info">
              <span className="stat-value" style={{ color: stat.color }}>{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="revenue-summary"
          onClick={() => setIsRevenueBreakdownOpen((isOpen) => !isOpen)}
          aria-expanded={isRevenueBreakdownOpen}
          aria-controls="active-plan-revenue-breakdown"
        >
          <div className="stat-icon revenue-summary-icon">
            <IndianRupee size={18} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{formatCurrency(stats.activeRevenue)}</span>
            <span className="stat-label">Active plan revenue</span>
          </div>
          <ChevronDown
            size={18}
            className={`revenue-chevron ${isRevenueBreakdownOpen ? 'is-open' : ''}`}
            aria-hidden="true"
          />
        </button>
        {isRevenueBreakdownOpen && (
          <div id="active-plan-revenue-breakdown" className="revenue-breakdown">
            <div className="revenue-breakdown-heading">
              <span>Active plans</span>
              <span>{stats.active}</span>
            </div>
            {planRevenue.length > 0 ? (
              <ul className="revenue-plan-list">
                {planRevenue.map(([planName, plan]) => (
                  <li key={planName}>
                    <span className="plan-revenue-name">
                      {planName}
                      <small>{plan.subscriptions} {plan.subscriptions === 1 ? 'subscription' : 'subscriptions'}</small>
                    </span>
                    <strong>{formatCurrency(plan.totalAmount)}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="revenue-empty-state">No active plans yet.</p>
            )}
          </div>
        )}
        {stats.totalPending > 0 && (
          <div className="pending-summary">
            <Wallet size={18} />
            <span>Pending payments</span>
            <strong>{formatCurrency(stats.totalPending)}</strong>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardStats;
