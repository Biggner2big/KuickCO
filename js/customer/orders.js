// ============================================================================
// QuickCO Customer Portal — Order History & Receipts
// ============================================================================

import { supabase } from '../supabase-client.js';
import { getCurrentProfile, getCurrentUser } from '../auth.js';
import { formatPKR, formatDate, getStatusBadge, escapeHTML } from '../shared/utils.js';
import { fetchAllBookings } from '../shared/data-store.js';

export async function renderCustomerOrders(container) {
  const profile = getCurrentProfile();
  const user = getCurrentUser();

  container.innerHTML = `
    <div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div>
          <h2>My Order History</h2>
          <p style="color: var(--text-muted); font-size: 14px;">All packages addressed to you.</p>
        </div>
      </div>

      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="table-container" style="border: none;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Tracking #</th>
                <th>Booking Date</th>
                <th>Sender / Merchant</th>
                <th>Destination</th>
                <th>COD Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="cust-history-tbody">
              <tr>
                <td colspan="7" style="text-align: center; padding: 32px; color: var(--text-muted);">
                  Loading shipment records...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  try {
    const orders = await fetchAllBookings();

    const tbody = document.getElementById('cust-history-tbody');
    if (!orders || orders.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
            No shipment records found.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = orders.map(o => `
      <tr>
        <td><strong style="font-family: monospace; color: var(--primary);">${escapeHTML(o.tracking_number)}</strong></td>
        <td>${formatDate(o.booking_date)}</td>
        <td>${escapeHTML(o.sender_company || o.sender_name || 'Merchant')}</td>
        <td>${escapeHTML(o.receiver_city)}</td>
        <td><strong>${formatPKR(o.cod_amount)}</strong></td>
        <td>${getStatusBadge(o.status)}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="window.location.hash='#/track/${o.tracking_number}'">Track Live 🔍</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error("Customer orders load error:", err);
  }
}
