// ============================================================================
// QuickCO Client Portal — Shopify Integration & CSV Ingestion
// ============================================================================

import { supabase } from '../supabase-client.js';
import { getCurrentProfile } from '../auth.js';
import { showToast, generateClientTrackingNumber, escapeHTML } from '../shared/utils.js';

export async function renderShopifyImport(container) {
  const profile = getCurrentProfile();

  container.innerHTML = `
    <div style="max-width: 900px; margin: 0 auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div>
          <h2>Shopify Order Sync & Ingestion</h2>
          <p style="color: var(--text-muted); font-size: 14px;">Import Shopify export CSV files with automatic deduplication.</p>
        </div>
        <a href="#/client/orders" class="btn btn-secondary">← Back to Orders</a>
      </div>

      <!-- File Dropzone -->
      <div class="card" style="margin-bottom: 24px; padding: 36px; text-align: center; border: 2px dashed #cbd5e1; background: #fafbfc;">
        <div style="font-size: 40px; margin-bottom: 12px;">🛍️</div>
        <h3 style="font-size: 18px; margin-bottom: 8px;">Upload Shopify Orders CSV</h3>
        <p style="color: var(--text-muted); font-size: 13px; max-width: 500px; margin: 0 auto 20px;">
          Export your orders from Shopify Admin (Orders → Export → CSV) and upload here. Duplicate orders are automatically skipped.
        </p>
        <input type="file" id="shopify-csv-file" accept=".csv" style="display: none;">
        <button class="btn btn-primary" onclick="document.getElementById('shopify-csv-file').click()">Select CSV File</button>
      </div>

      <!-- Preview & Import Status -->
      <div id="shopify-preview-card" class="card" style="display: none;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="font-size: 16px;" id="shopify-preview-count">Parsed Orders Preview</h3>
          <button class="btn btn-primary" id="btn-execute-shopify-import">🚀 Confirm & Import Orders</button>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Order Ref</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Destination</th>
                <th>COD Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="shopify-preview-tbody"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const fileInput = document.getElementById('shopify-csv-file');
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleShopifyCsvFile(file, profile?.id);
  });
}

let parsedShopifyRows = [];

function handleShopifyCsvFile(file, clientId) {
  if (!window.Papa) {
    showToast("CSV parser library is not loaded", "error");
    return;
  }

  window.Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      const rows = results.data;
      if (!rows || rows.length === 0) {
        showToast("The uploaded CSV is empty", "warning");
        return;
      }

      // Check existing imported shopify orders for deduplication
      const { data: existingImports } = await supabase
        .from('shopify_imported_orders')
        .select('shopify_order_id')
        .eq('client_id', clientId);

      const existingSet = new Set((existingImports || []).map(r => String(r.shopify_order_id)));

      parsedShopifyRows = [];
      const tbody = document.getElementById('shopify-preview-tbody');
      tbody.innerHTML = '';

      rows.forEach(row => {
        const orderId = row['Name'] || row['Order ID'] || row['Id'];
        if (!orderId) return;

        const isDuplicate = existingSet.has(String(orderId));
        const receiverName = row['Shipping Name'] || row['Billing Name'] || 'Customer';
        const receiverPhone = row['Shipping Phone'] || row['Phone'] || '-';
        const receiverCity = row['Shipping City'] || row['City'] || 'Karachi';
        const receiverAddress = row['Shipping Address1'] || row['Address1'] || 'Address';
        const codAmount = Number(row['Total'] || row['Total Price'] || 0);

        parsedShopifyRows.push({
          orderId,
          receiverName,
          receiverPhone,
          receiverCity,
          receiverAddress,
          codAmount,
          isDuplicate,
          raw: row
        });

        tbody.innerHTML += `
          <tr style="${isDuplicate ? 'opacity: 0.5; background: #fff1f2;' : ''}">
            <td><strong>${escapeHTML(orderId)}</strong></td>
            <td>${escapeHTML(receiverName)}</td>
            <td>${escapeHTML(receiverPhone)}</td>
            <td>${escapeHTML(receiverCity)}</td>
            <td><strong>Rs. ${codAmount}</strong></td>
            <td>${isDuplicate ? '<span class="badge badge-returned">Already Imported</span>' : '<span class="badge badge-booked">Ready</span>'}</td>
          </tr>
        `;
      });

      document.getElementById('shopify-preview-card').style.display = 'block';
      const readyCount = parsedShopifyRows.filter(r => !r.isDuplicate).length;
      document.getElementById('shopify-preview-count').textContent = `Parsed ${parsedShopifyRows.length} orders (${readyCount} new ready to import)`;
      
      document.getElementById('btn-execute-shopify-import').onclick = () => executeImport(clientId);
    }
  });
}

async function executeImport(clientId) {
  const readyRows = parsedShopifyRows.filter(r => !r.isDuplicate);
  if (readyRows.length === 0) {
    showToast("No new orders to import", "warning");
    return;
  }

  const btn = document.getElementById('btn-execute-shopify-import');
  btn.disabled = true;
  btn.textContent = 'Importing...';

  try {
    let successCount = 0;
    for (const r of readyRows) {
      const tn = generateClientTrackingNumber();
      
      // 1. Insert booking
      const { data: booking, error: bErr } = await supabase.from('bookings').insert([{
        client_id: clientId,
        tracking_number: tn,
        booking_date: new Date().toISOString().split('T')[0],
        receiver_name: r.receiverName,
        receiver_phone: r.receiverPhone,
        receiver_address: r.receiverAddress,
        receiver_city: r.receiverCity,
        cod_amount: r.codAmount,
        cod_status: 'pending',
        payment_method: 'COD',
        status: 'Booked',
        source: 'shopify',
        description: `Shopify Order ${r.orderId}`
      }]).select().single();

      if (!bErr && booking) {
        // 2. Track event
        await supabase.from('tracking_events').insert([{
          booking_id: booking.id,
          tracking_number: tn,
          status: 'Booked',
          location: r.receiverCity,
          note: `Imported from Shopify Order #${r.orderId}`
        }]);

        // 3. Mark in shopify_imported_orders
        await supabase.from('shopify_imported_orders').insert([{
          client_id: clientId,
          shopify_order_id: String(r.orderId),
          tracking_number: tn
        }]);

        successCount++;
      }
    }

    showToast(`Successfully imported ${successCount} orders!`, 'success');
    window.location.hash = '#/client/orders';
  } catch (err) {
    console.error("Shopify import execution error:", err);
    showToast("Some orders failed to import", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = '🚀 Confirm & Import Orders';
  }
}
