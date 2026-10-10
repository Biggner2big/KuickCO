// ============================================================================
// QuickCO Client Portal — Barcode Label Printing Engine
// ============================================================================

import { supabase } from '../supabase-client.js';
import { getCurrentProfile } from '../auth.js';
import { formatPKR, formatDate, escapeHTML } from '../shared/utils.js';
import { renderBarcode } from '../shared/barcode.js';

export async function renderBarcodeLabels(container, trackingNumbers = []) {
  const profile = getCurrentProfile();

  container.innerHTML = `
    <div>
      <div class="no-print" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div>
          <h2>Print Shipping Labels</h2>
          <p style="color: var(--text-muted); font-size: 14px;">Scannable CODE128 thermal and sticker labels.</p>
        </div>
        <div style="display: flex; gap: 10px; align-items: center;">
          <select id="select-label-size" class="form-control" style="width: 170px;">
            <option value="medium" selected>Medium (100×75mm)</option>
            <option value="small">Small (100×50mm)</option>
            <option value="large">Large (100×100mm)</option>
            <option value="thermal">Thermal (100×150mm)</option>
          </select>
          <button class="btn btn-primary" onclick="window.print()">🖨️ Print Now</button>
          <a href="#/client/orders" class="btn btn-secondary">← Back</a>
        </div>
      </div>

      <div id="labels-render-area" class="label-container" style="display: flex; flex-wrap: wrap; gap: 16px; justify-content: center;">
        <div style="padding: 40px; color: var(--text-muted);">Generating barcode labels...</div>
      </div>
    </div>
  `;

  // Fetch bookings data for selected tracking numbers
  if (!trackingNumbers || trackingNumbers.length === 0) {
    document.getElementById('labels-render-area').innerHTML = `
      <div class="card" style="padding: 32px; text-align: center;">
        <p>No tracking numbers specified for printing.</p>
        <a href="#/client/orders" class="btn btn-primary" style="margin-top: 12px;">Go to Orders List</a>
      </div>
    `;
    return;
  }

  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .in('tracking_number', trackingNumbers);

    if (error) throw error;

    const renderArea = document.getElementById('labels-render-area');
    renderArea.innerHTML = bookings.map((b, idx) => `
      <div class="label-medium" id="label-box-${idx}" style="background: #fff; border: 1.5px solid #000; border-radius: 4px; padding: 12px; width: 380px; box-sizing: border-box; font-family: Arial, sans-serif;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #000; padding-bottom: 6px; margin-bottom: 6px;">
          <div>
            <strong style="font-size: 15px; font-weight: 900; letter-spacing: -0.5px;">QuickCO</strong>
            <span style="font-size: 10px; color: #444; display: block;">Express Logistics</span>
          </div>
          <div style="text-align: right;">
            <strong style="font-size: 12px;">${escapeHTML(b.sender_company || b.sender_name || 'Shipper')}</strong>
          </div>
        </div>

        <div style="text-align: center; margin: 4px 0;">
          <div style="font-size: 11px; font-weight: bold; font-family: monospace;">TRACKING: ${escapeHTML(b.tracking_number)}</div>
          <svg id="barcode-svg-${idx}" style="max-width: 100%; height: 55px; margin: 2px 0;"></svg>
        </div>

        <div style="border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 6px 0; margin: 6px 0; font-size: 11px;">
          <div style="font-size: 12px; font-weight: bold;">TO: ${escapeHTML(b.receiver_name)}</div>
          <div>📞 ${escapeHTML(b.receiver_phone)}</div>
          <div style="line-height: 1.2; margin-top: 2px;">🏠 ${escapeHTML(b.receiver_address)}, <strong>${escapeHTML(b.receiver_city)}</strong></div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
          <div>
            <div><strong>Weight:</strong> ${b.weight} kg &nbsp;|&nbsp; <strong>Qty:</strong> ${b.quantity}</div>
            <div style="font-size: 10px; color: #666;">Date: ${formatDate(b.booking_date)}</div>
          </div>
          <div style="background: #000; color: #fff; padding: 4px 8px; border-radius: 3px; font-weight: 900; font-size: 13px;">
            ${b.payment_method === 'COD' ? `COD: ${formatPKR(b.cod_amount)}` : 'PREPAID'}
          </div>
        </div>
      </div>
    `).join('');

    // Render barcodes for each label
    bookings.forEach((b, idx) => {
      renderBarcode(`#barcode-svg-${idx}`, b.tracking_number, {
        height: 48,
        width: 1.8,
        fontSize: 11
      });
    });

  } catch (err) {
    console.error("Barcode labels rendering error:", err);
  }
}
