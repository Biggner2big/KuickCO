// ============================================================================
// QuickCO Shared Utilities & Toast Notification Engine
// ============================================================================

import { CONFIG } from '../config.js';

// Currency Formatter
export function formatPKR(amount) {
  const num = Number(amount) || 0;
  return `Rs. ${num.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// Date Formatter
export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Date Time Formatter
export function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

// HTML Escaper
export function escapeHTML(str) {
  if (typeof str !== 'string') return str ?? '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// Status Badge HTML Helper
export function getStatusBadge(status) {
  const s = status || 'Booked';
  let badgeClass = 'badge-booked';
  switch (s.toLowerCase()) {
    case 'picked up': badgeClass = 'badge-pickup'; break;
    case 'in transit': badgeClass = 'badge-transit'; break;
    case 'out for delivery': badgeClass = 'badge-delivery'; break;
    case 'delivered': badgeClass = 'badge-delivered'; break;
    case 'returned': badgeClass = 'badge-returned'; break;
    case 'cancelled': badgeClass = 'badge-cancelled'; break;
  }
  return `<span class="badge ${badgeClass}">${escapeHTML(s)}</span>`;
}

// Toast Notification Engine
export function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';
  if (type === 'warning') icon = '⚠️';

  toast.innerHTML = `
    <span>${icon}</span>
    <span style="flex: 1;">${escapeHTML(message)}</span>
    <button style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:16px;" onclick="this.parentElement.remove()">×</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Fallback client-side tracking number generator if RPC is unavailable
export function generateClientTrackingNumber() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const datePart = `${String(d.getFullYear()).slice(-2)}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `${CONFIG.trackingPrefix}-${datePart}-${randomPart}`;
}
