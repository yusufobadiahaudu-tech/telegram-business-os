export function formatMoney(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
}

export function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

export function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

export function initials(value: string) {
  return value.replace(/^@/, '').split(/[\s_-]+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'TB';
}

export function statusClass(status: string) {
  return `status-badge status-${status.toLowerCase().replace(/\s+/g, '-')}`;
}