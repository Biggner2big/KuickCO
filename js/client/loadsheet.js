// ============================================================================
// QuickCO Client Portal — Courier Load Sheet (Pickup Manifest)
// ============================================================================

import { supabase } from '../supabase-client.js';
import { getCurrentProfile } from '../auth.js';
import { formatPKR, formatDate, escapeHTML } from '../shared/utils.js';

export async function renderLoadsheet(container, trackingNumbers = []) {
  const profile = getCurrentProfile();

  container.innerHTML = `
    <div>
      <div class="no-print" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div>
          <h2>Courier Load Sheet (Pickup Manifest)</h2>
          <p style="color: var(--text-muted); font-size: 14px;">Official handover document for courier pickup verification.</p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-primary" onclick="window.print()">🖨️ Print Load Sheet</button>
          <a href="#/client/orders" class="btn btn-secondary">← Back to Orders</a>
        </div>
      </div>

      <div id="loadsheet-content" class="card" style="padding: 32px; background: #fff;">
        <div style="text-align: center; color: var(--text-muted);">Generating Load Sheet...</div>
      </div>
    </div>
  `;

  if (!trackingNumbers || trackingNumbers.length === 0) {
    document.getElementById('loadsheet-content').innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <p>No parcels selected for the load sheet.</p>
        <a href="#/client/orders" class="btn btn-primary" style="margin-top: 12px;">Go to Orders</a>
      </div>
    `;
    return;
  }

  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .in('tracking_number', trackingNumbers)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const totalWeight = bookings.reduce((sum, b) => sum + (Number(b.weight) || 0), 0);
    const totalCod = bookings.reduce((sum, b) => sum + (Number(b.cod_amount) || 0), 0);
    const todayStr = formatDate(new Date().toISOString());

    const content = document.getElementById('loadsheet-content');
    content.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 16px;">
        <div>
          <h1 style="font-size: 22px; font-weight: 900; margin: 0;">QuickCO Courier Handover Manifest</h1>
          <p style="font-size: 12px; color: #555; margin-top: 2px;">Shipper: <strong>${escapeHTML(profile?.company_name || profile?.full_name || 'Merchant')}</strong> | Phone: ${escapeHTML(profile?.phone || '-')}</p>
        </div>
        <div style="text-align: right; font-size: 12px;">
          <div><strong>Date:</strong> ${todayStr}</div>
          <div><strong>Manifest ID:</strong> MNF-${Date.now().toString().slice(-6)}</div>
        </div>
      </div>

      <!-- Summary KPI Block -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; font-size: 13px;">
        <div><strong>Total Parcels:</strong> ${bookings.length} pcs</div>
        <div><strong>Total Weight:</strong> ${totalWeight.toFixed(2)} kg</div>
        <div><strong>Total Declared COD:</strong> ${formatPKR(totalCod)}</div>
      </div>

      <table class="loadsheet-table" style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <thead>
          <tr style="background: #f1f5f9; text-align: left;">
            <th style="padding: 8px; border: 1px solid #cbd5e1; width: 35px; text-align: center;">#</th>
            <th style="padding: 8px; border: 1px solid #cbd5e1;">Tracking Number</th>
            <th style="padding: 8px; border: 1px solid #cbd5e1;">Consignee Details</th>
            <th style="padding: 8px; border: 1px solid #cbd5e1;">Destination</th>
            <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">Weight</th>
            <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">COD Amount</th>
            <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; width: 80px;">Rider Scan</th>
          </tr>
        </thead>
        <tbody>
          ${bookings.map((b, i) => `
            <tr>
              <td style="padding: 7px; border: 1px solid #cbd5e1; text-align: center;">${i + 1}</td>
              <td style="padding: 7px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: bold;">${escapeHTML(b.tracking_number)}</td>
              <td style="padding: 7px; border: 1px solid #cbd5e1;">
                <strong>${escapeHTML(b.receiver_name)}</strong> (${escapeHTML(b.receiver_phone)})
              </td>
              <td style="padding: 7px; border: 1px solid #cbd5e1;">${escapeHTML(b.receiver_city)}</td>
              <td style="padding: 7px; border: 1px solid #cbd5e1; text-align: right;">${b.weight || 0.5} kg</td>
              <td style="padding: 7px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">${formatPKR(b.cod_amount)}</td>
              <td style="padding: 7px; border: 1px solid #cbd5e1; text-align: center;">[ &nbsp;&nbsp; ]</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Signatures Footer -->
      <div class="loadsheet-signatures" style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; font-size: 12px;">
        <div>
          <div style="border-bottom: 1px solid #000; height: 30px;"></div>
          <div style="padding-top: 6px;">
            <strong>Shipper Handover Signature:</strong><br>
            Name: ______________________ Date: _________
          </div>
        </div>
        <div>
          <div style="border-bottom: 1px solid #000; height: 30px;"></div>
          <div style="padding-top: 6px;">
            <strong>Courier Rider Pickup Signature:</strong><br>
            Rider ID / Name: _______________ Vehicle #: _______
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    console.error("Loadsheet fetch error:", err);
  }
}
