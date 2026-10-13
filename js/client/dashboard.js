// ============================================================================
// QuickCO Client Portal — Dashboard Module
// ============================================================================

import { supabase } from '../supabase-client.js';
import { getCurrentProfile } from '../auth.js';
import { formatPKR, formatDate, getStatusBadge, escapeHTML } from '../shared/utils.js';
import { fetchAllBookings } from '../shared/data-store.js';

let statusChartInstance = null;
let velocityChartInstance = null;

export async function renderClientDashboard(container) {
  const profile = getCurrentProfile();
  
  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <div>
        <h2>Welcome back, ${escapeHTML(profile?.company_name || profile?.full_name || 'Partner')}! 👋</h2>
        <p style="color: var(--text-muted); font-size: 14px;">Here is an overview of your logistics performance today.</p>
      </div>
      <div style="display: flex; gap: 10px;">
        <button class="btn btn-secondary" id="btn-refresh-dash">🔄 Refresh</button>
        <button class="btn btn-primary" onclick="window.location.hash='#/client/create'">+ New Booking</button>
      </div>
    </div>

    <!-- KPI Metric Cards -->
    <div class="dashboard-grid">
      <div class="card stat-card">
        <div>
          <div class="stat-title">Total Shipments</div>
          <div class="stat-value" id="kpi-total">-</div>
          <span style="font-size: 12px; color: var(--text-muted);">All time bookings</span>
        </div>
        <div class="stat-icon" style="background: var(--primary-light); color: var(--primary); font-size: 20px;">📦</div>
      </div>

      <div class="card stat-card">
        <div>
          <div class="stat-title">In Transit</div>
          <div class="stat-value" id="kpi-transit">-</div>
          <span style="font-size: 12px; color: var(--warning);">On route</span>
        </div>
        <div class="stat-icon" style="background: var(--warning-bg); color: var(--warning); font-size: 20px;">🚚</div>
      </div>

      <div class="card stat-card">
        <div>
          <div class="stat-title">Delivered</div>
          <div class="stat-value" id="kpi-delivered">-</div>
          <span style="font-size: 12px; color: var(--success);" id="kpi-success-rate">-% success</span>
        </div>
        <div class="stat-icon" style="background: var(--success-bg); color: var(--success); font-size: 20px;">✅</div>
      </div>

      <div class="card stat-card">
        <div>
          <div class="stat-title">Pending COD</div>
          <div class="stat-value" id="kpi-cod" style="font-size: 22px;">-</div>
          <span style="font-size: 12px; color: var(--accent);">Cash to collect</span>
        </div>
        <div class="stat-icon" style="background: var(--accent-light); color: var(--accent); font-size: 20px;">💰</div>
      </div>
    </div>

    <!-- Analytics Chart & Quick Distribution -->
    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 28px;">
      <div class="card">
        <h3 style="font-size: 16px; margin-bottom: 16px;">Shipment Velocity</h3>
        <div style="height: 240px; position: relative;">
          <canvas id="chart-velocity"></canvas>
        </div>
      </div>

      <div class="card">
        <h3 style="font-size: 16px; margin-bottom: 16px;">Status Breakdown</h3>
        <div style="height: 240px; position: relative;">
          <canvas id="chart-status"></canvas>
        </div>
      </div>
    </div>

    <!-- Recent Bookings Table -->
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="font-size: 16px;">Recent Bookings</h3>
        <a href="#/client/orders" style="font-size: 13px; font-weight: 600;">View All Orders →</a>
      </div>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Tracking #</th>
              <th>Date</th>
              <th>Consignee</th>
              <th>Destination</th>
              <th>COD Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="dash-recent-tbody">
            <tr>
              <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">Loading recent orders...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('btn-refresh-dash')?.addEventListener('click', () => loadDashboardData(profile?.id));
  await loadDashboardData(profile?.id);
}

async function loadDashboardData(clientId) {
  if (!clientId) return;

  try {
    const orders = await fetchAllBookings(clientId);

    const total = orders.length;
    const delivered = orders.filter(o => o.status === 'Delivered').length;
    const inTransit = orders.filter(o => ['In Transit', 'Out For Delivery', 'Picked Up'].includes(o.status)).length;
    const pendingCod = orders
      .filter(o => o.status !== 'Returned' && o.status !== 'Cancelled' && o.cod_status === 'pending')
      .reduce((acc, curr) => acc + (Number(curr.cod_amount) || 0), 0);

    const successRate = total > 0 ? Math.round((delivered / total) * 100) : 0;

    // Update KPI UI
    document.getElementById('kpi-total').textContent = total;
    document.getElementById('kpi-delivered').textContent = delivered;
    document.getElementById('kpi-transit').textContent = inTransit;
    document.getElementById('kpi-cod').textContent = formatPKR(pendingCod);
    document.getElementById('kpi-success-rate').textContent = `${successRate}% success rate`;

    // Render Recent Table (up to 6)
    const tbody = document.getElementById('dash-recent-tbody');
    if (!tbody) return;

    if (orders.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding: 32px; color: var(--text-muted);">
            No bookings found yet. <a href="#/client/create" style="font-weight: 600;">Create your first order</a>
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = orders.slice(0, 6).map(o => `
        <tr>
          <td><strong style="font-family: var(--font-mono); color: var(--primary);">${escapeHTML(o.tracking_number)}</strong></td>
          <td>${formatDate(o.booking_date)}</td>
          <td><strong>${escapeHTML(o.receiver_name)}</strong><br><span style="font-size: 11px; color: var(--text-muted);">${escapeHTML(o.receiver_phone)}</span></td>
          <td>${escapeHTML(o.receiver_city)}</td>
          <td><strong>${formatPKR(o.cod_amount)}</strong></td>
          <td>${getStatusBadge(o.status)}</td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-secondary btn-sm" onclick="window.location.hash='#/track/${o.tracking_number}'" title="Track">🔍</button>
              <button class="btn btn-secondary btn-sm" onclick="window.printSingleLabel('${o.tracking_number}')" title="Print Label">🏷️</button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    // Render Charts if Chart.js exists
    if (window.Chart) {
      renderDashboardCharts(orders);
    }
  } catch (err) {
    console.error("Dashboard data fetch error:", err);
  }
}

function renderDashboardCharts(orders) {
  // Chart 1: Velocity by Status
  const statusCounts = {
    Booked: 0,
    'Picked Up': 0,
    'In Transit': 0,
    'Out For Delivery': 0,
    Delivered: 0,
    Returned: 0
  };

  orders.forEach(o => {
    if (statusCounts[o.status] !== undefined) statusCounts[o.status]++;
  });

  const ctxStatus = document.getElementById('chart-status')?.getContext('2d');
  if (ctxStatus) {
    if (statusChartInstance) statusChartInstance.destroy();
    statusChartInstance = new window.Chart(ctxStatus, {
      type: 'doughnut',
      data: {
        labels: Object.keys(statusCounts),
        datasets: [{
          data: Object.values(statusCounts),
          backgroundColor: ['#94a3b8', '#2980b9', '#f59e0b', '#d97706', '#27ae60', '#c0392b']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }
        }
      }
    });
  }

  // Chart 2: Recent Velocity (last 7 days)
  const last7Days = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    last7Days[key] = 0;
  }

  orders.forEach(o => {
    const d = o.booking_date;
    if (last7Days[d] !== undefined) last7Days[d]++;
  });

  const ctxVelocity = document.getElementById('chart-velocity')?.getContext('2d');
  if (ctxVelocity) {
    if (velocityChartInstance) velocityChartInstance.destroy();
    velocityChartInstance = new window.Chart(ctxVelocity, {
      type: 'bar',
      data: {
        labels: Object.keys(last7Days).map(k => k.slice(5)),
        datasets: [{
          label: 'Bookings',
          data: Object.values(last7Days),
          backgroundColor: '#1e6b3e',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    });
  }
}
