const escapeCsvValue = (value) => {
  const text = String(value ?? '');
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  if (/[",\n]/.test(safeText)) {
    return `"${safeText.replace(/"/g, '""')}"`;
  }
  return safeText;
};

const getHistoryMessage = (item) => {
  if (item.message) return item.message;

  const messages = {
    created: 'Customer added.',
    updated: 'Customer details updated.',
    renewed: 'Subscription renewed.',
    payment_recorded: 'Payment recorded.',
    deleted: 'Customer record deleted.',
    baseline_import: 'Existing customer record imported from the previous data.',
  };

  return messages[item.action] || '';
};

export const customersToCsv = (customers) => {
  const headers = ['Name', 'Mobile', 'Plan', 'Plan Type', 'Amount', 'Paid', 'Pending', 'Start Date', 'End Date', 'Status', 'Days Left', 'Notes'];

  const rows = customers.map((customer) => {
    const amount = Number(customer.amount) || 0;
    const paid = Number(customer.paidAmount ?? amount) || 0;
    const pending = Math.max(0, amount - paid);

    const endDate = new Date(customer.endDate);
    endDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

    return [
      customer.name,
      customer.mobile,
      customer.plan,
      customer.planType,
      amount,
      paid,
      pending,
      customer.startDate,
      customer.endDate,
      daysLeft >= 0 ? 'Active' : 'Expired',
      daysLeft,
      customer.notes,
    ];
  });

  return [headers, ...rows]
    .map((row) => row.map(escapeCsvValue).join(','))
    .join('\n');
};

export const historyToCsv = (historyItems) => {
  const headers = [
    'Date & Time',
    'Customer Name',
    'Mobile',
    'Action',
    'Activity Details',
    'Plan',
    'Plan Type',
    'Plan Amount',
    'Payment Amount',
    'Total Paid',
    'Start Date',
    'End Date',
    'Notes'
  ];

  const actionMap = {
    created: 'Created',
    updated: 'Updated',
    renewed: 'Renewed',
    payment_recorded: 'Payment Recorded',
    deleted: 'Deleted',
    baseline_import: 'Initial Record'
  };

  const rows = historyItems.map((item) => {
    const timestampFormatted = item.timestamp
      ? new Date(item.timestamp).toLocaleString('en-IN')
      : '';
    const startDateFormatted = item.startDate
      ? new Date(item.startDate).toLocaleDateString('en-IN')
      : '';
    const endDateFormatted = item.endDate
      ? new Date(item.endDate).toLocaleDateString('en-IN')
      : '';

    return [
      timestampFormatted,
      item.customerName || '',
      item.customerMobile || '',
      actionMap[item.action] || item.action || '',
      getHistoryMessage(item),
      item.plan || '',
      item.planType || '',
      item.amount ?? '',
      item.paymentAmount ?? '',
      item.paidAmount ?? '',
      startDateFormatted,
      endDateFormatted,
      item.notes || ''
    ];
  });

  return [headers, ...rows]
    .map((row) => row.map(escapeCsvValue).join(','))
    .join('\n');
};

export const downloadCsv = (csvText, filename) => {
  const blob = new Blob([`\uFEFF${csvText}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
