// ============================================================================
// QuickCO Admin Portal — Courier Master Operations & Client Bookings
// ============================================================================

import { supabase } from '../supabase-client.js';
import { CONFIG } from '../config.js';
import { formatPKR, formatDate, getStatusBadge, showToast, escapeHTML } from '../shared/utils.js';

let cachedAdminOrders = [];
let cachedClientsList = [];

export async function renderAdminDashboard(container) {
  container.innerHTML = `
    <div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
        <div>
          <h2>Courier Hub Operations Console 🏢</h2>
          <p style="color: var(--text-muted); font-size: 14px;">Master view of all client bookings, hub dispatches, and delivery lifecycles across Pakistan.</p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-secondary" id="btn-admin-refresh">🔄 Refresh Hub</button>
          <a href="#/admin/dispatch" class="btn btn-primary">🚚 Quick Hub Dispatch</a>
        </div>
      </div>

      <!-- Master KPI Cards -->
      <div class="dashboard-grid">
        <div class="card stat-card">
          <div>
            <div class="stat-title">Active Clients (Merchants)</div>
            <div class="stat-value" id="adm-kpi-clients">-</div>
            <span style="font-size: 12px; color: var(--text-muted);">Registered shippers</span>
          </div>
          <div class="stat-icon" style="background: #e0f2fe; color: #0369a1; font-size: 20px;">🏢</div>
        </div>

        <div class="card stat-card">
          <div>
            <div class="stat-title">Total Bookings (All Clients)</div>
            <div class="stat-value" id="adm-kpi-total">-</div>
            <span style="font-size: 12px; color: var(--text-muted);">Network volume</span>
          </div>
          <div class="stat-icon" style="background: var(--primary-light); color: var(--primary); font-size: 20px;">📦</div>
        </div>

        <div class="card stat-card">
          <div>
            <div class="stat-title">Out for Delivery / In Transit</div>
            <div class="stat-value" id="adm-kpi-transit" style="color: var(--warning);">-</div>
            <span style="font-size: 12px; color: var(--warning);">On route with riders</span>
          </div>
          <div class="stat-icon" style="background: var(--warning-bg); color: var(--warning); font-size: 20px;">🛵</div>
        </div>

        <div class="card stat-card">
          <div>
            <div class="stat-title">Total COD in Network</div>
            <div class="stat-value" id="adm-kpi-cod" style="font-size: 22px;">-</div>
            <span style="font-size: 12px; color: var(--accent);">Cash to collect / remit</span>
          </div>
          <div class="stat-icon" style="background: var(--accent-light); color: var(--accent); font-size: 20px;">💰</div>
        </div>
      </div>

      <!-- Filter Bar: Client Selector, Status, City, Search -->
      <div class="card" style="margin-bottom: 20px; padding: 16px 20px;">
        <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
          <div style="flex: 1; min-width: 220px;">
            <input type="text" id="adm-search" class="form-control" placeholder="Search tracking #, consignee, or phone...">
          </div>
          <div style="width: 200px;">
            <select id="adm-filter-client" class="form-control">
              <option value="ALL">All Clients (Merchants)</option>
            </select>
          </div>
          <div style="width: 170px;">
            <select id="adm-filter-status" class="form-control">
              <option value="ALL">All Statuses</option>
              ${CONFIG.statuses.map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
          </div>
          <div style="width: 150px;">
            <select id="adm-filter-city" class="form-control">
              <option value="ALL">All Cities</option>
              ${CONFIG.popularCities.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
          <button class="btn btn-secondary" id="btn-adm-reset">Reset</button>
        </div>
      </div>

      <!-- Master Bookings Table -->
      <div class="card" style="padding: 0; overflow: hidden;">
        <div style="padding: 16px 20px; border-bottom: 1px solid var(--surface-border); display: flex; justify-content: space-between; align-items: center;">
          <h3 style="font-size: 15px;">All Client Consignments</h3>
          <span style="font-size: 13px; color: var(--text-muted);" id="adm-table-count">Loading consignments...</span>
        </div>
        <div class="table-container" style="border: none;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Tracking #</th>
                <th>Client / Merchant</th>
                <th>Booking Date</th>
                <th>Consignee</th>
                <th>Destination</th>
                <th>Weight</th>
                <th>COD Amount</th>
                <th>Status</th>
                <th style="text-align: right;">Courier Action</th>
              </tr>
            </thead>
            <tbody id="adm-orders-tbody">
              <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: var(--text-muted);">
                  Fetching network bookings...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Admin Status Modal -->
    <div class="modal-overlay" id="adm-status-modal">
      <div class="modal-card">
        <div class="modal-header">
          <h3>Hub Delivery Dispatch</h3>
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('adm-status-modal').classList.remove('open')">✕</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="adm-booking-id">
          <input type="hidden" id="adm-tracking-number">
          
          <div class="form-group">
            <label class="form-label">Tracking Number</label>
            <div id="adm-tracking-disp" style="font-family: var(--font-mono); font-weight: 700; color: var(--primary); font-size: 16px;"></div>
          </div>

          <div class="form-group">
            <label class="form-label">Merchant / Client</label>
            <div id="adm-client-disp" style="font-weight: 600; color: var(--text-main);"></div>
          </div>

          <div class="form-group">
            <label class="form-label">Update Hub Status</label>
            <select class="form-control" id="adm-new-status">
              ${CONFIG.statuses.map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Operational Hub / Station</label>
            <input type="text" class="form-control" id="adm-location" placeholder="e.g. Karachi Central Hub">
          </div>

          <div class="form-group">
            <label class="form-label">Rider / Delivery Remarks</label>
            <input type="text" class="form-control" id="adm-note" placeholder="e.g. Dispatched with Rider Ali for delivery">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('adm-status-modal').classList.remove('open')">Cancel</button>
          <button class="btn btn-primary" id="btn-adm-save-status">Broadcast Status Update 📡</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-admin-refresh')?.addEventListener('click', loadAdminData);
  document.getElementById('adm-search')?.addEventListener('input', applyAdminFilters);
  document.getElementById('adm-filter-client')?.addEventListener('change', applyAdminFilters);
  document.getElementById('adm-filter-status')?.addEventListener('change', applyAdminFilters);
  document.getElementById('adm-filter-city')?.addEventListener('change', applyAdminFilters);
  document.getElementById('btn-adm-reset')?.addEventListener('click', () => {
    document.getElementById('adm-search').value = '';
    document.getElementById('adm-filter-client').value = 'ALL';
    document.getElementById('adm-filter-status').value = 'ALL';
    document.getElementById('adm-filter-city').value = 'ALL';
    applyAdminFilters();
  });

  document.getElementById('btn-adm-save-status')?.addEventListener('click', saveAdminStatusChange);

  await loadAdminData();
}

async function loadAdminData() {
  try {
    // 1. Fetch all clients
    const { data: clients } = await supabase
      .from('profiles')
      .select('id, company_name, full_name, email, city, phone')
      .eq('role', 'client');

    cachedClientsList = clients || [];

    // Populate client filter dropdown
    const clientSelect = document.getElementById('adm-filter-client');
    if (clientSelect) {
      clientSelect.innerHTML = `<option value="ALL">All Clients (Merchants)</option>` +
        cachedClientsList.map(c => `<option value="${c.id}">${escapeHTML(c.company_name || c.full_name || c.email)}</option>`).join('');
    }

    // 2. Fetch all bookings with client profile mapping
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*, client:client_id(company_name, full_name, email, phone)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    cachedAdminOrders = bookings || [];

    // 3. Update Master Metrics
    const totalOrders = cachedAdminOrders.length;
    const inTransit = cachedAdminOrders.filter(b => ['Picked Up', 'In Transit', 'Out For Delivery'].includes(b.status)).length;
    const totalCod = cachedAdminOrders.reduce((sum, b) => sum + (Number(b.cod_amount) || 0), 0);

    document.getElementById('adm-kpi-clients').textContent = cachedClientsList.length;
    document.getElementById('adm-kpi-total').textContent = totalOrders;
    document.getElementById('adm-kpi-transit').textContent = inTransit;
    document.getElementById('adm-kpi-cod').textContent = formatPKR(totalCod);

    applyAdminFilters();
  } catch (err) {
    console.error("Admin data load error:", err);
    showToast(err.message || "Failed to load admin console", "error");
  }
}

function applyAdminFilters() {
  const query = (document.getElementById('adm-search')?.value || '').toLowerCase().trim();
  const clientFilter = document.getElementById('adm-filter-client')?.value || 'ALL';
  const statusFilter = document.getElementById('adm-filter-status')?.value || 'ALL';
  const cityFilter = document.getElementById('adm-filter-city')?.value || 'ALL';

  const filtered = cachedAdminOrders.filter(o => {
    const matchQuery = !query ||
      o.tracking_number.toLowerCase().includes(query) ||
      o.receiver_name.toLowerCase().includes(query) ||
      o.receiver_phone.toLowerCase().includes(query);

    const matchClient = clientFilter === 'ALL' || o.client_id === clientFilter;
    const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;
    const matchCity = cityFilter === 'ALL' || o.receiver_city === cityFilter;

    return matchQuery && matchClient && matchStatus && matchCity;
  });

  renderAdminOrderRows(filtered);
}

function renderAdminOrderRows(orders) {
  const tbody = document.getElementById('adm-orders-tbody');
  const countSpan = document.getElementById('adm-table-count');
  if (!tbody) return;

  countSpan.textContent = `Showing ${orders.length} of ${cachedAdminOrders.length} consignments`;

  if (orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 40px; color: var(--text-muted);">
          No consignments found for the selected filter.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = orders.map(o => {
    const clientName = o.client?.company_name || o.client?.full_name || o.sender_company || 'Merchant';
    return `
      <tr>
        <td>
          <strong style="font-family: var(--font-mono); color: var(--primary);">${escapeHTML(o.tracking_number)}</strong>
        </td>
        <td>
          <strong>${escapeHTML(clientName)}</strong>
          <div style="font-size: 11px; color: var(--text-muted);">${escapeHTML(o.sender_city || 'Origin')}</div>
        </td>
        <td>${formatDate(o.booking_date)}</td>
        <td>
          <strong>${escapeHTML(o.receiver_name)}</strong>
          <div style="font-size: 11px; color: var(--text-muted);">${escapeHTML(o.receiver_phone)}</div>
        </td>
        <td>${escapeHTML(o.receiver_city)}</td>
        <td>${o.weight || 0.5} kg</td>
        <td>
          <strong>${formatPKR(o.cod_amount)}</strong>
          <div style="font-size: 10px; color: var(--text-muted);">${o.payment_method || 'COD'}</div>
        </td>
        <td>${getStatusBadge(o.status)}</td>
        <td style="text-align: right;">
          <div style="display: flex; gap: 4px; justify-content: flex-end;">
            <button class="btn btn-primary btn-sm" onclick="window.openAdminStatusModal('${o.id}', '${o.tracking_number}', '${o.status}', '${escapeHTML(clientName)}')" title="Update Delivery Status">
              Update Hub 🚚
            </button>
            <button class="btn btn-secondary btn-sm" onclick="window.location.hash='#/track/${o.tracking_number}'" title="Track Live">
              🔍
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.openAdminStatusModal = (id, tn, currentStatus, clientName) => {
  document.getElementById('adm-booking-id').value = id;
  document.getElementById('adm-tracking-number').value = tn;
  document.getElementById('adm-tracking-disp').textContent = tn;
  document.getElementById('adm-client-disp').textContent = clientName;
  document.getElementById('adm-new-status').value = currentStatus;
  document.getElementById('adm-status-modal').classList.add('open');
};

async function saveAdminStatusChange() {
  const id = document.getElementById('adm-booking-id').value;
  const tn = document.getElementById('adm-tracking-number').value;
  const newStatus = document.getElementById('adm-new-status').value;
  const loc = document.getElementById('adm-location').value.trim() || 'Central Dispatch Hub';
  const note = document.getElementById('adm-note').value.trim() || `Status updated to ${newStatus}`;

  try {
    // 1. Update Booking
    const { error: updErr } = await supabase
      .from('bookings')
      .update({
        status: newStatus,
        cod_status: newStatus === 'Delivered' ? 'collected' : 'pending'
      })
      .eq('id', id);

    if (updErr) throw updErr;

    // 2. Insert Tracking Event
    await supabase.from('tracking_events').insert([{
      booking_id: id,
      tracking_number: tn,
      status: newStatus,
      location: loc,
      note: note
    }]);

    showToast(`Status updated to ${newStatus} for ${tn}`, 'success');
    document.getElementById('adm-status-modal').classList.remove('open');
    loadAdminData();
  } catch (err) {
    showToast(err.message || "Failed to update status", "error");
  }
}
