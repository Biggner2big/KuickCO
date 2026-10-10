// ============================================================================
// QuickCO Client Portal — Reports & Financial Analytics
// ============================================================================

import { supabase } from '../supabase-client.js';
import { getCurrentProfile } from '../auth.js';
import { CONFIG } from '../config.js';
import { formatPKR, formatDate, showToast, escapeHTML } from '../shared/utils.js';

export async function renderReports(container) {
  const profile = getCurrentProfile();

  container.innerHTML = `
    <div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div>
          <h2>Logistics & Financial Reports</h2>
          <p style="color: var(--text-muted); font-size: 14px;">Audit deliveries, COD remittances, and operational performance.</p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-secondary" id="btn-export-csv">📥 Export CSV (Excel)</button>
          <button class="btn btn-secondary" id="btn-export-pdf">📄 Export PDF Report</button>
        </div>
      </div>

      <!-- Filter Controls -->
      <div class="card" style="margin-bottom: 24px;">
        <div style="display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-end;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">From Date</label>
            <input type="date" class="form-control" id="report-from-date">
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">To Date</label>
            <input type="date" class="form-control" id="report-to-date">
          </div>
          <div class="form-group" style="margin-bottom: 0; min-width: 160px;">
            <label class="form-label">Delivery Status</label>
            <select class="form-control" id="report-filter-status">
              <option value="ALL">All Statuses</option>
              ${CONFIG.statuses.map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
          </div>
          <button class="btn btn-primary" id="btn-run-report">Filter Report</button>
        </div>
      </div>

      <!-- Financial Metrics Summary -->
      <div class="dashboard-grid">
        <div class="card stat-card">
          <div>
            <div class="stat-title">Period Volume</div>
            <div class="stat-value" id="rep-vol">0</div>
          </div>
          <div class="stat-icon" style="background:#e0f2fe; color:#0369a1;">📦</div>
        </div>
        <div class="card stat-card">
          <div>
            <div class="stat-title">Delivered Ratio</div>
            <div class="stat-value" id="rep-ratio" style="color:var(--success);">0%</div>
          </div>
          <div class="stat-icon" style="background:var(--success-bg); color:var(--success);">📈</div>
        </div>
        <div class="card stat-card">
          <div>
            <div class="stat-title">Collected COD</div>
            <div class="stat-value" id="rep-collected" style="font-size:22px;">Rs. 0</div>
          </div>
          <div class="stat-icon" style="background:#fef3c7; color:#d97706;">💵</div>
        </div>
        <div class="card stat-card">
          <div>
            <div class="stat-title">Pending COD</div>
            <div class="stat-value" id="rep-pending" style="font-size:22px;">Rs. 0</div>
          </div>
          <div class="stat-icon" style="background:var(--warning-bg); color:var(--warning);">⏳</div>
        </div>
      </div>

      <!-- Report Table -->
      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="table-container" style="border: none;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Tracking #</th>
                <th>Booking Date</th>
                <th>Customer</th>
                <th>Destination</th>
                <th>Weight</th>
                <th>COD Amount</th>
                <th>Payment Status</th>
                <th>Current Status</th>
              </tr>
            </thead>
            <tbody id="report-tbody">
              <tr>
                <td colspan="8" style="text-align: center; padding: 32px; color: var(--text-muted);">
                  Loading report records...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Default dates (past 30 days)
  const dTo = new Date();
  const dFrom = new Date();
  dFrom.setDate(dTo.getDate() - 30);
  document.getElementById('report-to-date').value = dTo.toISOString().split('T')[0];
  document.getElementById('report-from-date').value = dFrom.toISOString().split('T')[0];

  document.getElementById('btn-run-report').addEventListener('click', () => loadReport(profile?.id));
  document.getElementById('btn-export-csv').addEventListener('click', exportCSV);
  document.getElementById('btn-export-pdf').addEventListener('click', exportPDF);

  await loadReport(profile?.id);
}

let reportDataset = [];

async function loadReport(clientId) {
  if (!clientId) return;

  const fromDate = document.getElementById('report-from-date').value;
  const toDate = document.getElementById('report-to-date').value;
  const statusFilter = document.getElementById('report-filter-status').value;

  try {
    let query = supabase
      .from('bookings')
      .select('*')
      .eq('client_id', clientId)
      .gte('booking_date', fromDate)
      .lte('booking_date', toDate)
      .order('booking_date', { ascending: false });

    if (statusFilter !== 'ALL') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) throw error;

    reportDataset = data || [];

    // Financial calculations
    const vol = reportDataset.length;
    const delivered = reportDataset.filter(r => r.status === 'Delivered').length;
    const ratio = vol > 0 ? Math.round((delivered / vol) * 100) : 0;
    
    const collectedCod = reportDataset
      .filter(r => r.status === 'Delivered')
      .reduce((s, r) => s + (Number(r.cod_amount) || 0), 0);

    const pendingCod = reportDataset
      .filter(r => r.status !== 'Delivered' && r.status !== 'Returned' && r.status !== 'Cancelled')
      .reduce((s, r) => s + (Number(r.cod_amount) || 0), 0);

    document.getElementById('rep-vol').textContent = vol;
    document.getElementById('rep-ratio').textContent = `${ratio}%`;
    document.getElementById('rep-collected').textContent = formatPKR(collectedCod);
    document.getElementById('rep-pending').textContent = formatPKR(pendingCod);

    const tbody = document.getElementById('report-tbody');
    if (reportDataset.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:32px; color:var(--text-muted);">No records found for this period.</td></tr>`;
      return;
    }

    tbody.innerHTML = reportDataset.map(r => `
      <tr>
        <td><strong style="font-family:monospace; color:var(--primary);">${escapeHTML(r.tracking_number)}</strong></td>
        <td>${formatDate(r.booking_date)}</td>
        <td>${escapeHTML(r.receiver_name)}</td>
        <td>${escapeHTML(r.receiver_city)}</td>
        <td>${r.weight || 0.5} kg</td>
        <td><strong>${formatPKR(r.cod_amount)}</strong></td>
        <td>${r.cod_status || 'pending'}</td>
        <td><span class="badge badge-booked">${escapeHTML(r.status)}</span></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error("Report generation error:", err);
    showToast("Failed to fetch report data", "error");
  }
}

function exportCSV() {
  if (reportDataset.length === 0) {
    showToast("No data to export", "warning");
    return;
  }

  const headers = ["Tracking Number", "Booking Date", "Consignee", "Phone", "Address", "City", "Weight", "COD Amount", "COD Status", "Status"];
  const rows = reportDataset.map(r => [
    `"${r.tracking_number}"`,
    `"${r.booking_date}"`,
    `"${r.receiver_name}"`,
    `"${r.receiver_phone}"`,
    `"${(r.receiver_address || '').replace(/"/g, '""')}"`,
    `"${r.receiver_city}"`,
    r.weight || 0.5,
    r.cod_amount || 0,
    `"${r.cod_status || 'pending'}"`,
    `"${r.status}"`
  ]);

  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `QuickCO_Report_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportPDF() {
  if (!window.jspdf?.jsPDF) {
    showToast("PDF exporter library not available, fallback to Print", "info");
    window.print();
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("QuickCO Logistics Summary Report", 14, 20);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
  doc.text(`Total Records: ${reportDataset.length}`, 14, 34);

  let y = 46;
  doc.setFontSize(11);
  doc.text("Tracking Number", 14, y);
  doc.text("Consignee", 65, y);
  doc.text("City", 120, y);
  doc.text("COD Amount", 155, y);
  doc.text("Status", 185, y);

  y += 6;
  doc.setLineWidth(0.5);
  doc.line(14, y, 200, y);
  y += 6;

  doc.setFontSize(9);
  reportDataset.slice(0, 30).forEach(r => {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    doc.text(String(r.tracking_number).slice(0, 18), 14, y);
    doc.text(String(r.receiver_name).slice(0, 22), 65, y);
    doc.text(String(r.receiver_city).slice(0, 15), 120, y);
    doc.text(`Rs. ${r.cod_amount}`, 155, y);
    doc.text(String(r.status), 185, y);
    y += 7;
  });

  doc.save(`QuickCO_Report_${new Date().toISOString().split('T')[0]}.pdf`);
}
