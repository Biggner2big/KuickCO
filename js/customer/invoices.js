// ============================================================================
// QuickCO Customer Portal — Invoices & Delivery Receipts
// ============================================================================

import { getCurrentProfile } from '../auth.js';
import { formatPKR, formatDate, formatDateTime, escapeHTML, showToast } from '../shared/utils.js';
import { fetchAllBookings } from '../shared/data-store.js';

export async function renderCustomerInvoices(container) {
  const profile = getCurrentProfile();

  container.innerHTML = `
    <div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div>
          <h2>Delivery Receipts & Invoices 🧾</h2>
          <p style="color: var(--text-muted); font-size: 14px;">Official proof of delivery and cash-on-delivery payment vouchers.</p>
        </div>
      </div>

      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="table-container" style="border: none;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Receipt #</th>
                <th>Tracking #</th>
                <th>Delivered Date</th>
                <th>Sender / Merchant</th>
                <th>Payment Mode</th>
                <th>Amount Paid</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody id="cust-invoices-tbody">
              <tr>
                <td colspan="7" style="text-align: center; padding: 32px; color: var(--text-muted);">
                  Loading receipts...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Receipt Modal -->
    <div class="modal-overlay" id="receipt-modal">
      <div class="modal-card" style="max-width: 500px;">
        <div class="modal-header">
          <h3>E-Receipt / Proof of Payment</h3>
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('receipt-modal').classList.remove('open')">✕</button>
        </div>
        <div class="modal-body" id="receipt-modal-body">
          <!-- Rendered dynamically -->
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('receipt-modal').classList.remove('open')">Close</button>
          <button class="btn btn-primary" onclick="window.print()">🖨️ Print Receipt</button>
        </div>
      </div>
    </div>
  `;

  try {
    const orders = await fetchAllBookings();
    // Invoices are generated for all orders or specifically delivered / COD orders
    const receipts = orders.filter(o => o.status === 'Delivered' || o.payment_method === 'COD');

    const tbody = document.getElementById('cust-invoices-tbody');
    if (!receipts || receipts.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
            No delivery receipts available yet. Invoices appear here once packages are delivered.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = receipts.map((o, idx) => {
      const receiptNo = `REC-${String(o.tracking_number).slice(-6)}-${idx + 101}`;
      return `
        <tr>
          <td><strong style="font-family: var(--font-mono); color: var(--primary);">${receiptNo}</strong></td>
          <td><span style="font-family: var(--font-mono); font-size: 12px;">${escapeHTML(o.tracking_number)}</span></td>
          <td>${formatDate(o.booking_date)}</td>
          <td>${escapeHTML(o.sender_company || o.sender_name || 'Merchant')}</td>
          <td><span class="badge badge-booked">${o.payment_method}</span></td>
          <td><strong style="color: var(--success);">${formatPKR(o.cod_amount)}</strong></td>
          <td style="text-align: right;">
            <button class="btn btn-secondary btn-sm" onclick="window.viewReceipt('${escapeHTML(receiptNo)}', '${escapeHTML(o.tracking_number)}', '${escapeHTML(o.sender_company || o.sender_name || 'Merchant')}', '${o.cod_amount}', '${formatDate(o.booking_date)}', '${escapeHTML(o.receiver_name)}')">
              View Voucher 📄
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error("Invoices error:", err);
  }

  window.viewReceipt = (recNo, tn, sender, amount, date, receiver) => {
    const modalBody = document.getElementById('receipt-modal-body');
    modalBody.innerHTML = `
      <div style="text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 16px; margin-bottom: 16px;">
        <div style="font-size: 24px; font-weight: 800; color: var(--primary);">QuickCO Logistics</div>
        <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Electronic Cash On Delivery Receipt</div>
      </div>
      <div style="font-size: 13px; line-height: 1.8;">
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">Receipt No:</span>
          <strong>${recNo}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">Date & Time:</span>
          <span>${date}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">Tracking Number:</span>
          <span style="font-family: var(--font-mono);">${tn}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">Shipper / Merchant:</span>
          <strong>${sender}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">Consignee (Receiver):</span>
          <span>${receiver}</span>
        </div>
      </div>

      <div style="margin-top: 20px; padding: 14px; background: var(--success-bg); border-radius: var(--radius-md); border: 1px solid var(--success); text-align: center;">
        <div style="font-size: 12px; color: #166534; font-weight: 600;">AMOUNT PAID (COD)</div>
        <div style="font-size: 26px; font-weight: 800; color: #166534;">${formatPKR(amount)}</div>
        <div style="font-size: 11px; color: #166534; margin-top: 4px;">Status: Payment Collected & Reconciled ✅</div>
      </div>
    `;
    document.getElementById('receipt-modal').classList.add('open');
  };
}
