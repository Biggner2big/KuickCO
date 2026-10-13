// ============================================================================
// QuickCO Admin Portal — Client Merchants Directory
// ============================================================================

import { getAllClients } from '../auth.js';
import { formatDate, escapeHTML } from '../shared/utils.js';

export async function renderAdminClients(container) {
  container.innerHTML = `
    <div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div>
          <h2>Registered Client Merchants Directory</h2>
          <p style="color: var(--text-muted); font-size: 14px;">Business accounts booking courier shipments through the portal.</p>
        </div>
        <a href="#/admin/dashboard" class="btn btn-secondary">← Back to Hub</a>
      </div>

      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="table-container" style="border: none;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Company / Merchant</th>
                <th>Contact Person</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Base City</th>
                <th>Registered On</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody id="adm-clients-tbody">
              <tr>
                <td colspan="7" style="text-align: center; padding: 32px; color: var(--text-muted);">
                  Loading merchants directory...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  try {
    const clients = await getAllClients();

    const tbody = document.getElementById('adm-clients-tbody');
    if (!clients || clients.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
            No client accounts registered yet.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = clients.map(c => `
      <tr>
        <td><strong>${escapeHTML(c.company_name || c.full_name || 'Merchant Account')}</strong></td>
        <td>${escapeHTML(c.full_name || '-')}</td>
        <td>${escapeHTML(c.email)}</td>
        <td>${escapeHTML(c.phone || '-')}</td>
        <td>${escapeHTML(c.city || 'Karachi')}</td>
        <td>${formatDate(c.created_at)}</td>
        <td style="text-align: right;">
          <button class="btn btn-secondary btn-sm" onclick="window.location.hash='#/admin/dashboard'">
            View Bookings 📦
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error("Clients directory error:", err);
  }
}
