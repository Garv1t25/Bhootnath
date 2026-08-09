const escapeCsvValue = (value) => {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
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
