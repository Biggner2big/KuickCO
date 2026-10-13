// ============================================================================
// QuickCO Client Portal — Air Waybill (AWB) Generator (3 per A4)
// ============================================================================

import { supabase } from '../supabase-client.js';
import { getCurrentProfile } from '../auth.js';
import { formatPKR, formatDate, escapeHTML } from '../shared/utils.js';
import { renderBarcode, renderQRCode } from '../shared/barcode.js';
import { fetchBookingsByTrackingNumbers } from '../shared/data-store.js';

export async function renderAirWaybills(container, trackingNumbers = []) {
  const profile = getCurrentProfile();

  // Fetch client settings for copies and branding
  let settings = null;
  if (profile?.id) {
    try {
      const { data } = await supabase
        .from('client_settings')
        .select('*')
        .eq('client_id', profile.id)
        .single();
      settings = data;
    } catch (e) {
      // ignore
    }
  }

  const awbCopies = settings?.awb_copies || 1;

  container.innerHTML = `
    <div>
      <div class="no-print" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div>
          <h2>Air Waybill (AWB) — 3 Per A4 Standard</h2>
          <p style="color: var(--text-muted); font-size: 14px;">Logistics shipping receipt and consignee delivery documentation.</p>
        </div>
        <div style="display: flex; gap: 10px; align-items: center;">
          <button class="btn btn-primary" onclick="window.print()">🖨️ Print Air Waybills</button>
          <a href="#/client/orders" class="btn btn-secondary">← Back to Orders</a>
        </div>
      </div>

      <div id="awb-render-area" class="awb-page-container">
        <div style="padding: 40px; text-align: center; color: var(--text-muted);">Generating AWB sheets...</div>
      </div>
    </div>
  `;

  if (!trackingNumbers || trackingNumbers.length === 0) {
    document.getElementById('awb-render-area').innerHTML = `
      <div class="card" style="padding: 32px; text-align: center;">
        <p>No tracking numbers specified for AWB generation.</p>
        <a href="#/client/orders" class="btn btn-primary" style="margin-top: 12px;">Go to Orders List</a>
      </div>
    `;
    return;
  }

  try {
    const bookings = await fetchBookingsByTrackingNumbers(trackingNumbers);

    if (!bookings || bookings.length === 0) {
      document.getElementById('awb-render-area').innerHTML = `
        <div class="card" style="padding: 32px; text-align: center;">
          <p>No booking details found for the selected tracking numbers.</p>
          <a href="#/client/orders" class="btn btn-primary" style="margin-top: 12px;">Return to Orders</a>
        </div>
      `;
      return;
    }

    // Generate AWBs based on copies setting
    const renderArea = document.getElementById('awb-render-area');
    let cardsHtml = '';

    bookings.forEach((b, bIdx) => {
      for (let copyNum = 1; copyNum <= awbCopies; copyNum++) {
        const uniqueId = `awb-${bIdx}-c${copyNum}`;
        cardsHtml += `
          <div class="awb-card">
            <!-- Header -->
            <div class="awb-header">
              <div>
                <div class="awb-brand">QuickCO Express</div>
                <div style="font-size: 8pt; color: #555;">Smart Logistics Management Network • www.quickco.pk</div>
              </div>
              <div class="awb-meta">
                <div style="font-size: 9pt; font-weight: bold; text-transform: uppercase;">Copy ${copyNum} of ${awbCopies}</div>
                <div style="font-size: 8pt;">Date: ${formatDate(b.booking_date)}</div>
              </div>
            </div>

            <!-- Tracking Barcode & Details -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1pt solid #000; padding-bottom: 2mm; margin-bottom: 3mm;">
              <div style="flex: 1;">
                <div style="font-size: 13pt; font-weight: 900; font-family: monospace;">TRACKING: ${escapeHTML(b.tracking_number)}</div>
                <svg id="awb-barcode-${uniqueId}" style="max-width: 260px; height: 38px;"></svg>
              </div>
              <div id="awb-qr-${uniqueId}" style="width: 50px; height: 50px;"></div>
            </div>

            <!-- Sender & Receiver Grid -->
            <div class="awb-grid">
              <!-- Sender Box -->
              <div class="awb-box">
                <div class="awb-box-title">Shipper (From):</div>
                <div class="awb-box-content">
                  <strong>${escapeHTML(b.sender_company || b.sender_name)}</strong><br>
                  📞 ${escapeHTML(b.sender_phone)}<br>
                  📍 ${escapeHTML(b.sender_address)}, ${escapeHTML(b.sender_city)}
                </div>
              </div>

              <!-- Receiver Box -->
              <div class="awb-box">
                <div class="awb-box-title">Consignee (To):</div>
                <div class="awb-box-content">
                  <strong>${escapeHTML(b.receiver_name)}</strong><br>
                  📞 ${escapeHTML(b.receiver_phone)}<br>
                  📍 ${escapeHTML(b.receiver_address)}<br>
                  <strong>City: ${escapeHTML(b.receiver_city)}</strong>
                </div>
              </div>
            </div>

            <!-- Parcel & COD Info -->
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 4mm; margin-bottom: 2mm;">
              <div class="awb-box" style="font-size: 8.5pt;">
                <div><strong>Description:</strong> ${escapeHTML(b.description || 'General Merchandise')}</div>
                <div><strong>Weight:</strong> ${b.weight} kg &nbsp;|&nbsp; <strong>Pieces:</strong> ${b.quantity} &nbsp;|&nbsp; <strong>Type:</strong> ${b.parcel_type || 'Standard'}</div>
                ${b.special_instructions ? `<div><strong>Note:</strong> ${escapeHTML(b.special_instructions)}</div>` : ''}
              </div>

              <div class="awb-cod-highlight">
                <div style="font-size: 8pt; text-transform: uppercase;">Amount to Collect</div>
                ${b.payment_method === 'COD' ? formatPKR(b.cod_amount) : 'PREPAID'}
              </div>
            </div>

            <!-- Footer / Signature -->
            <div style="display: flex; justify-content: space-between; align-items: flex-end; font-size: 7.5pt; border-top: 1pt dashed #000; padding-top: 2mm;">
              <div>
                * Consignee signature acknowledges receipt of package in intact condition.<br>
                For live tracking, visit quickco.pk or scan QR code.
              </div>
              <div style="text-align: center; width: 140px;">
                <div style="border-bottom: 1pt solid #000; height: 18px;"></div>
                <div>Receiver Signature & Date</div>
              </div>
            </div>
          </div>
        `;
      }
    });

    renderArea.innerHTML = cardsHtml;

    // Render barcodes and QRs
    bookings.forEach((b, bIdx) => {
      for (let copyNum = 1; copyNum <= awbCopies; copyNum++) {
        const uniqueId = `awb-${bIdx}-c${copyNum}`;
        renderBarcode(`#awb-barcode-${uniqueId}`, b.tracking_number, {
          height: 34,
          width: 1.5,
          fontSize: 10,
          margin: 2
        });
        renderQRCode(`awb-qr-${uniqueId}`, `${window.location.origin}/#/track/${b.tracking_number}`, 48);
      }
    });

  } catch (err) {
    console.error("AWB rendering error:", err);
  }
}
