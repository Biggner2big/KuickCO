// ============================================================================
// QuickCO Client Portal — Generic Bulk CSV Upload Engine
// ============================================================================

import { supabase } from '../supabase-client.js';
import { getCurrentProfile } from '../auth.js';
import { showToast, generateClientTrackingNumber, escapeHTML } from '../shared/utils.js';

export async function renderBulkImport(container) {
  const profile = getCurrentProfile();

  container.innerHTML = `
    <div style="max-width: 900px; margin: 0 auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div>
          <h2>Bulk CSV Booking Ingestion</h2>
          <p style="color: var(--text-muted); font-size: 14px;">Upload multiple shipments at once using a standard CSV file.</p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-secondary" id="btn-download-sample-csv">📥 Download Sample CSV</button>
          <a href="#/client/orders" class="btn btn-secondary">← Back</a>
        </div>
      </div>

      <div class="card" style="margin-bottom: 24px; padding: 36px; text-align: center; border: 2px dashed #cbd5e1; background: #fafbfc;">
        <div style="font-size: 40px; margin-bottom: 12px;">📊</div>
        <h3 style="font-size: 18px; margin-bottom: 8px;">Upload Bulk Courier CSV</h3>
        <p style="color: var(--text-muted); font-size: 13px; max-width: 500px; margin: 0 auto 20px;">
          Columns required: <code>Receiver Name, Phone, Address, City, COD Amount, Weight</code>
        </p>
        <input type="file" id="bulk-csv-input" accept=".csv" style="display: none;">
        <button class="btn btn-primary" onclick="document.getElementById('bulk-csv-input').click()">Browse CSV File</button>
      </div>

      <div id="bulk-preview-card" class="card" style="display: none;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="font-size: 16px;" id="bulk-preview-heading">Parsed Shipments</h3>
          <button class="btn btn-primary" id="btn-process-bulk">Batch Book Shipments 🚀</button>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Receiver Name</th>
                <th>Phone</th>
                <th>Address</th>
                <th>City</th>
                <th>COD</th>
                <th>Weight</th>
              </tr>
            </thead>
            <tbody id="bulk-preview-tbody"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-download-sample-csv').addEventListener('click', downloadSampleCSV);
  document.getElementById('bulk-csv-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) parseBulkCSV(file, profile?.id);
  });
}

function downloadSampleCSV() {
  const csvContent = "Receiver Name,Phone,Address,City,COD Amount,Weight,Description\n" +
    "Ali Hassan,03001234567,Flat 4B DHA Phase 5,Karachi,2500,1.0,Apparel Item\n" +
    "Sara Khan,03219876543,House 12 Gulberg III,Lahore,3400,0.5,Cosmetics\n" +
    "Zubair Ahmed,03335554433,Street 9 F-10/2,Islamabad,1200,1.5,Books";
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "quickco_sample_bookings.csv";
  a.click();
  URL.revokeObjectURL(url);
}

let parsedBulkRows = [];

function parseBulkCSV(file, clientId) {
  if (!window.Papa) {
    showToast("PapaParse is missing", "error");
    return;
  }

  window.Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      parsedBulkRows = results.data.filter(r => r['Receiver Name'] || r['name'] || r['Customer']);
      if (parsedBulkRows.length === 0) {
        showToast("No valid rows detected", "warning");
        return;
      }

      const tbody = document.getElementById('bulk-preview-tbody');
      tbody.innerHTML = parsedBulkRows.map((r, i) => `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${escapeHTML(r['Receiver Name'] || r['name'] || '')}</strong></td>
          <td>${escapeHTML(r['Phone'] || r['phone'] || '')}</td>
          <td>${escapeHTML(r['Address'] || r['address'] || '')}</td>
          <td>${escapeHTML(r['City'] || r['city'] || 'Karachi')}</td>
          <td>Rs. ${escapeHTML(r['COD Amount'] || r['cod'] || 0)}</td>
          <td>${escapeHTML(r['Weight'] || r['weight'] || '0.5')} kg</td>
        </tr>
      `).join('');

      document.getElementById('bulk-preview-heading').textContent = `Parsed ${parsedBulkRows.length} Shipments`;
      document.getElementById('bulk-preview-card').style.display = 'block';
      document.getElementById('btn-process-bulk').onclick = () => executeBulkBookings(clientId);
    }
  });
}

async function executeBulkBookings(clientId) {
  const btn = document.getElementById('btn-process-bulk');
  btn.disabled = true;
  btn.textContent = 'Booking in background...';

  try {
    let count = 0;
    for (const r of parsedBulkRows) {
      const tn = generateClientTrackingNumber();
      const name = r['Receiver Name'] || r['name'] || 'Customer';
      const phone = r['Phone'] || r['phone'] || '03000000000';
      const address = r['Address'] || r['address'] || 'Street Address';
      const city = r['City'] || r['city'] || 'Karachi';
      const cod = Number(r['COD Amount'] || r['cod'] || 0);
      const weight = Number(r['Weight'] || r['weight'] || 0.5);

      const { data: b, error } = await supabase.from('bookings').insert([{
        client_id: clientId,
        tracking_number: tn,
        booking_date: new Date().toISOString().split('T')[0],
        receiver_name: name,
        receiver_phone: phone,
        receiver_address: address,
        receiver_city: city,
        cod_amount: cod,
        weight: weight,
        status: 'Booked',
        source: 'csv'
      }]).select().single();

      if (!error && b) {
        await supabase.from('tracking_events').insert([{
          booking_id: b.id,
          tracking_number: tn,
          status: 'Booked',
          location: city,
          note: 'Batch imported via CSV'
        }]);
        count++;
      }
    }

    showToast(`Successfully booked ${count} shipments!`, 'success');
    window.location.hash = '#/client/orders';
  } catch (err) {
    showToast("Bulk upload error", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = 'Batch Book Shipments 🚀';
  }
}
