// ============================================================================
// QuickCO Client Portal — Order Management & Batch Processing
// ============================================================================

import { supabase } from '../supabase-client.js';
import { getCurrentProfile } from '../auth.js';
import { CONFIG } from '../config.js';
import { formatPKR, formatDate, getStatusBadge, showToast, escapeHTML } from '../shared/utils.js';
import { fetchAllBookings, updateBookingStatus, deleteBooking, logTrackingEvent } from '../shared/data-store.js';

let cachedOrders = [];
let realtimeChannel = null;

export async function renderClientOrders(container) {
  const profile = getCurrentProfile();

  container.innerHTML = `
    <div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
        <div>
          <h2>Manage Orders & Shipments</h2>
          <p style="color: var(--text-muted); font-size: 14px;">Monitor shipment lifecycles, print thermal labels, or update delivery statuses in real-time.</p>
        </div>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button class="btn btn-secondary" id="btn-batch-labels">🏷️ Print Selected Labels</button>
          <button class="btn btn-secondary" id="btn-batch-awb">📄 Print Selected AWB</button>
          <button class="btn btn-secondary" id="btn-batch-loadsheet">📋 Generate Load Sheet</button>
          <a href="#/client/create" class="btn btn-primary">+ Create Order</a>
        </div>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="card" style="margin-bottom: 20px; padding: 16px 20px;">
        <div style="display: flex; gap: 14px; flex-wrap: wrap; align-items: center;">
          <div style="flex: 1; min-width: 240px;">
            <input type="text" id="order-search" class="form-control" placeholder="Search tracking #, customer name, or phone...">
          </div>
          <div style="width: 180px;">
            <select id="filter-status" class="form-control">
              <option value="ALL">All Statuses</option>
              ${CONFIG.statuses.map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
          </div>
          <div style="width: 160px;">
            <select id="filter-city" class="form-control">
              <option value="ALL">All Cities</option>
              ${CONFIG.popularCities.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
          <button class="btn btn-secondary" id="btn-reset-filters">Reset</button>
        </div>
      </div>

      <!-- Orders Data Table -->
      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="table-container" style="border: none;">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;"><input type="checkbox" id="select-all-orders"></th>
                <th>Tracking #</th>
                <th>Date</th>
                <th>Consignee</th>
                <th>Destination</th>
                <th>Weight / Qty</th>
                <th>COD Amount</th>
                <th>Status</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody id="orders-tbody">
              <tr>
                <td colspan="9" style="text-align: center; padding: 32px; color: var(--text-muted);">
                  Loading bookings from Supabase...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div id="orders-pagination" style="padding: 14px 20px; border-top: 1px solid var(--surface-border); display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: var(--text-muted);">
          <span id="orders-count-text">Showing 0 orders</span>
        </div>
      </div>
    </div>

    <!-- Status Change Modal -->
    <div class="modal-overlay" id="status-modal">
      <div class="modal-card">
        <div class="modal-header">
          <h3>Update Shipment Status</h3>
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('status-modal').classList.remove('open')">✕</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="modal-booking-id">
          <input type="hidden" id="modal-tracking-number">
          
          <div class="form-group">
            <label class="form-label">Tracking Number</label>
            <div id="modal-tracking-disp" style="font-family: var(--font-mono); font-weight: 700; color: var(--primary);"></div>
          </div>

          <div class="form-group">
            <label class="form-label">New Status</label>
            <select class="form-control" id="modal-new-status">
              ${CONFIG.statuses.map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Current Hub / Location</label>
            <input type="text" class="form-control" id="modal-location" placeholder="e.g. Karachi Central Hub">
          </div>

          <div class="form-group">
            <label class="form-label">Status Remarks / Note</label>
            <input type="text" class="form-control" id="modal-note" placeholder="e.g. Package dispatched for delivery">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('status-modal').classList.remove('open')">Cancel</button>
          <button class="btn btn-primary" id="btn-save-status">Update & Broadcast 📡</button>
        </div>
      </div>
    </div>
  `;

  // Attach event handlers
  document.getElementById('order-search')?.addEventListener('input', applyFilters);
  document.getElementById('filter-status')?.addEventListener('change', applyFilters);
  document.getElementById('filter-city')?.addEventListener('change', applyFilters);
  document.getElementById('btn-reset-filters')?.addEventListener('click', () => {
    document.getElementById('order-search').value = '';
    document.getElementById('filter-status').value = 'ALL';
    document.getElementById('filter-city').value = 'ALL';
    applyFilters();
  });

  document.getElementById('select-all-orders')?.addEventListener('change', (e) => {
    document.querySelectorAll('.row-select-checkbox').forEach(cb => cb.checked = e.target.checked);
  });

  document.getElementById('btn-batch-labels')?.addEventListener('click', handleBatchLabels);
  document.getElementById('btn-batch-awb')?.addEventListener('click', handleBatchAWB);
  document.getElementById('btn-batch-loadsheet')?.addEventListener('click', handleBatchLoadsheet);
  document.getElementById('btn-save-status')?.addEventListener('click', saveStatusChange);

  // Initial fetch and subscription
  await fetchOrders(profile?.id);
  setupRealtimeSubscription(profile?.id);
}

async function fetchOrders(clientId) {
  if (!clientId) return;
  try {
    cachedOrders = await fetchAllBookings(clientId);
    applyFilters();
  } catch (err) {
    console.error("fetchOrders error:", err);
  }
}

function setupRealtimeSubscription(clientId) {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }
  realtimeChannel = supabase
    .channel('bookings-realtime-' + clientId)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'bookings',
      filter: `client_id=eq.${clientId}`
    }, (payload) => {
      fetchOrders(clientId);
    })
    .subscribe();
}

function applyFilters() {
  const query = (document.getElementById('order-search')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('filter-status')?.value || 'ALL';
  const cityFilter = document.getElementById('filter-city')?.value || 'ALL';

  const filtered = cachedOrders.filter(o => {
    const matchQuery = !query || 
      o.tracking_number.toLowerCase().includes(query) ||
      o.receiver_name.toLowerCase().includes(query) ||
      o.receiver_phone.toLowerCase().includes(query);

    const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;
    const matchCity = cityFilter === 'ALL' || o.receiver_city === cityFilter;

    return matchQuery && matchStatus && matchCity;
  });

  renderOrderRows(filtered);
}

function renderOrderRows(orders) {
  const tbody = document.getElementById('orders-tbody');
  const countText = document.getElementById('orders-count-text');
  if (!tbody) return;

  countText.textContent = `Showing ${orders.length} of ${cachedOrders.length} bookings`;

  if (orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 40px; color: var(--text-muted);">
          No bookings match your current search criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = orders.map(o => `
    <tr>
      <td style="text-align: center;">
        <input type="checkbox" class="row-select-checkbox" value="${o.tracking_number}">
      </td>
      <td>
        <strong style="font-family: var(--font-mono); color: var(--primary);">${escapeHTML(o.tracking_number)}</strong>
        ${o.source === 'shopify' ? '<span class="badge" style="background:#e0f2fe;color:#0369a1;font-size:10px;margin-left:4px;">Shopify</span>' : ''}
      </td>
      <td>${formatDate(o.booking_date)}</td>
      <td>
        <strong>${escapeHTML(o.receiver_name)}</strong>
        <div style="font-size: 11px; color: var(--text-muted);">${escapeHTML(o.receiver_phone)}</div>
      </td>
      <td>${escapeHTML(o.receiver_city)}</td>
      <td>${o.weight || 0.5} kg (${o.quantity || 1} pcs)</td>
      <td>
        <strong>${formatPKR(o.cod_amount)}</strong>
        <div style="font-size: 10px; color: var(--text-muted);">${o.payment_method}</div>
      </td>
      <td>${getStatusBadge(o.status)}</td>
      <td style="text-align: right;">
        <div style="display: flex; gap: 4px; justify-content: flex-end;">
          <button class="btn btn-secondary btn-sm" onclick="window.openStatusModal('${o.id}', '${o.tracking_number}', '${o.status}')" title="Change Status">🔄</button>
          <button class="btn btn-secondary btn-sm" onclick="window.printSingleLabel('${o.tracking_number}')" title="Print Label">🏷️</button>
          <button class="btn btn-secondary btn-sm" onclick="window.printSingleAWB('${o.tracking_number}')" title="Print AWB">📄</button>
          <button class="btn btn-secondary btn-sm" onclick="window.location.hash='#/track/${o.tracking_number}'" title="Live Tracking">🔍</button>
          ${o.status === 'Booked' ? `<button class="btn btn-secondary btn-sm" onclick="window.deleteOrder('${o.id}')" title="Cancel/Delete" style="color:var(--danger);">🗑️</button>` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

// Global actions attached to window
window.openStatusModal = (id, tn, currentStatus) => {
  document.getElementById('modal-booking-id').value = id;
  document.getElementById('modal-tracking-number').value = tn;
  document.getElementById('modal-tracking-disp').textContent = tn;
  document.getElementById('modal-new-status').value = currentStatus;
  document.getElementById('status-modal').classList.add('open');
};

async function saveStatusChange() {
  const id = document.getElementById('modal-booking-id').value;
  const tn = document.getElementById('modal-tracking-number').value;
  const newStatus = document.getElementById('modal-new-status').value;
  const loc = document.getElementById('modal-location').value.trim() || 'Logistics Operations';
  const note = document.getElementById('modal-note').value.trim() || `Status updated to ${newStatus}`;

  try {
    await updateBookingStatus(id, tn, newStatus);
    await logTrackingEvent({
      booking_id: id,
      tracking_number: tn,
      status: newStatus,
      location: loc,
      note: note
    });

    showToast(`Status updated to ${newStatus} for ${tn}`, 'success');
    document.getElementById('status-modal').classList.remove('open');
    fetchOrders(getCurrentProfile()?.id);
  } catch (err) {
    showToast(err.message || 'Status update failed', 'error');
  }
}

window.deleteOrder = async (id) => {
  if (!confirm("Are you sure you want to cancel and delete this booked order?")) return;
  try {
    await deleteBooking(id);
    showToast("Order removed", "info");
    fetchOrders(getCurrentProfile()?.id);
  } catch (err) {
    showToast(err.message || "Failed to delete order", "error");
  }
};

function getSelectedTrackingNumbers() {
  const cbs = document.querySelectorAll('.row-select-checkbox:checked');
  return Array.from(cbs).map(cb => cb.value);
}

function handleBatchLabels() {
  const tns = getSelectedTrackingNumbers();
  if (tns.length === 0) {
    showToast("Please select at least one order using the checkboxes", "warning");
    return;
  }
  window.location.hash = `#/client/labels?tns=${encodeURIComponent(tns.join(','))}`;
}

function handleBatchAWB() {
  const tns = getSelectedTrackingNumbers();
  if (tns.length === 0) {
    showToast("Please select at least one order using the checkboxes", "warning");
    return;
  }
  window.location.hash = `#/client/awb?tns=${encodeURIComponent(tns.join(','))}`;
}

function handleBatchLoadsheet() {
  const tns = getSelectedTrackingNumbers();
  if (tns.length === 0) {
    showToast("Please select at least one order for the load sheet", "warning");
    return;
  }
  window.location.hash = `#/client/loadsheet?tns=${encodeURIComponent(tns.join(','))}`;
}

window.printSingleLabel = (tn) => {
  window.location.hash = `#/client/labels?tns=${tn}`;
};

window.printSingleAWB = (tn) => {
  window.location.hash = `#/client/awb?tns=${tn}`;
};
