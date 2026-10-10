// ============================================================================
// QuickCO Customer Portal — Customer Dashboard
// ============================================================================

import { supabase } from '../supabase-client.js';
import { getCurrentProfile, getCurrentUser } from '../auth.js';
import { formatPKR, formatDate, getStatusBadge, escapeHTML } from '../shared/utils.js';
import { fetchAllBookings } from '../shared/data-store.js';

export async function renderCustomerDashboard(container) {
  const profile = getCurrentProfile();
  const user = getCurrentUser();

  container.innerHTML = `
    <div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div>
          <h2>Hello, ${escapeHTML(profile?.full_name || 'Customer')}! 👋</h2>
          <p style="color: var(--text-muted); font-size: 14px;">Track your deliveries, check invoices, and update delivery preferences.</p>
        </div>
        <button class="btn btn-primary" onclick="window.location.hash='#/customer/track'">🔍 Track Shipment</button>
      </div>

      <!-- Quick Stats -->
      <div class="dashboard-grid">
        <div class="card stat-card">
          <div>
            <div class="stat-title">Incoming Shipments</div>
            <div class="stat-value" id="cust-kpi-incoming">-</div>
          </div>
          <div class="stat-icon" style="background:var(--info-bg); color:var(--info);">🚚</div>
        </div>
        <div class="card stat-card">
          <div>
            <div class="stat-title">Delivered</div>
            <div class="stat-value" id="cust-kpi-delivered">-</div>
          </div>
          <div class="stat-icon" style="background:var(--success-bg); color:var(--success);">📦</div>
        </div>
        <div class="card stat-card">
          <div>
            <div class="stat-title">COD Payable</div>
            <div class="stat-value" id="cust-kpi-cod" style="font-size:22px;">-</div>
          </div>
          <div class="stat-icon" style="background:var(--accent-light); color:var(--accent);">💰</div>
        </div>
      </div>

      <!-- Quick Tracker Widget -->
      <div class="card" style="margin-bottom: 24px; padding: 24px; background: #fafbfc;">
        <h3 style="font-size: 16px; margin-bottom: 12px;">Quick Parcel Search</h3>
        <div style="display: flex; gap: 10px; max-width: 500px;">
          <input type="text" id="cust-quick-tn" class="form-control" placeholder="Enter CPK tracking number...">
          <button class="btn btn-primary" id="btn-cust-quick-search">Search</button>
        </div>
      </div>

      <!-- Recent Customer Orders -->
      <div class="card" style="padding: 0; overflow: hidden;">
        <div style="padding: 20px 24px; border-bottom: 1px solid var(--surface-border); display: flex; justify-content: space-between; align-items: center;">
          <h3 style="font-size: 16px;">My Recent Orders</h3>
          <a href="#/customer/orders" style="font-size: 13px; font-weight: 600;">View All Orders →</a>
        </div>
        <div class="table-container" style="border: none;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Tracking #</th>
                <th>Shipper</th>
                <th>Booking Date</th>
                <th>COD Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="cust-orders-tbody">
              <tr>
                <td colspan="6" style="text-align: center; padding: 32px; color: var(--text-muted);">
                  Loading your shipments...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-cust-quick-search')?.addEventListener('click', () => {
    const tn = document.getElementById('cust-quick-tn').value.trim();
    if (tn) window.location.hash = `#/customer/track?tn=${tn}`;
  });

  await loadCustomerOrders(profile?.id, user?.email);
}

async function loadCustomerOrders(profileId, email) {
    const orders = await fetchAllBookings();
    const myOrders = orders || [];
    const incoming = myOrders.filter(o => ['Booked', 'Picked Up', 'In Transit', 'Out For Delivery'].includes(o.status)).length;
    const delivered = myOrders.filter(o => o.status === 'Delivered').length;
    const pendingCod = myOrders
      .filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled' && o.payment_method === 'COD')
      .reduce((s, o) => s + (Number(o.cod_amount) || 0), 0);

    document.getElementById('cust-kpi-incoming').textContent = incoming;
    document.getElementById('cust-kpi-delivered').textContent = delivered;
    document.getElementById('cust-kpi-cod').textContent = formatPKR(pendingCod);

    const tbody = document.getElementById('cust-orders-tbody');
    if (myOrders.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding: 40px; color: var(--text-muted);">
            No shipments found for your account. You can track any parcel using the search bar above.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = myOrders.slice(0, 6).map(o => `
      <tr>
        <td><strong style="font-family: monospace; color: var(--primary);">${escapeHTML(o.tracking_number)}</strong></td>
        <td>${escapeHTML(o.sender_company || o.sender_name || 'Merchant')}</td>
        <td>${formatDate(o.booking_date)}</td>
        <td><strong>${formatPKR(o.cod_amount)}</strong></td>
        <td>${getStatusBadge(o.status)}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="window.location.hash='#/track/${o.tracking_number}'">Track Live 🔍</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error("Customer dashboard load error:", err);
  }
}
