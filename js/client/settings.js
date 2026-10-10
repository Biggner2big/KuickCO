// ============================================================================
// QuickCO Client Portal — Business Profile & Shipper Settings
// ============================================================================

import { supabase } from '../supabase-client.js';
import { getCurrentProfile } from '../auth.js';
import { CONFIG } from '../config.js';
import { showToast, escapeHTML } from '../shared/utils.js';

export async function renderSettings(container) {
  const profile = getCurrentProfile();

  // Load existing settings
  let settings = null;
  if (profile?.id) {
    const { data } = await supabase
      .from('client_settings')
      .select('*')
      .eq('client_id', profile.id)
      .single();
    settings = data;
  }

  container.innerHTML = `
    <div style="max-width: 800px; margin: 0 auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div>
          <h2>Shipper Profile & Settings</h2>
          <p style="color: var(--text-muted); font-size: 14px;">Manage default pickup addresses, brand details, and print preferences.</p>
        </div>
      </div>

      <form id="form-client-settings">
        <div class="card" style="margin-bottom: 24px;">
          <h3 style="font-size: 16px; margin-bottom: 16px;">🏢 Shipper & Brand Identity</h3>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Brand / Company Name</label>
              <input type="text" class="form-control" id="set_company_name" value="${escapeHTML(settings?.company_name || profile?.company_name || '')}" placeholder="e.g. Urban Style PK">
            </div>
            <div class="form-group">
              <label class="form-label">Primary Contact Person</label>
              <input type="text" class="form-control" id="set_contact_person" value="${escapeHTML(settings?.contact_person || profile?.full_name || '')}" placeholder="e.g. Muhammad Kashif">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Support Phone</label>
              <input type="tel" class="form-control" id="set_phone" value="${escapeHTML(settings?.phone || profile?.phone || '')}" placeholder="03001234567">
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input type="email" class="form-control" id="set_email" value="${escapeHTML(settings?.email || profile?.email || '')}" readonly style="background:#f8fafc;">
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom: 24px;">
          <h3 style="font-size: 16px; margin-bottom: 16px;">📍 Default Addresses</h3>
          <div class="form-group">
            <label class="form-label">Business / Warehouse Pickup Address</label>
            <input type="text" class="form-control" id="set_business_address" value="${escapeHTML(settings?.business_address || profile?.address || '')}" placeholder="Plot 12, Industrial Area, Sector 15">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">City</label>
              <select class="form-control" id="set_city">
                ${CONFIG.popularCities.map(c => `<option value="${c}" ${c === (settings?.city || profile?.city) ? 'selected' : ''}>${c}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Return Package Address</label>
              <input type="text" class="form-control" id="set_return_address" value="${escapeHTML(settings?.return_address || '')}" placeholder="Same as pickup or alternate address">
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom: 24px;">
          <h3 style="font-size: 16px; margin-bottom: 16px;">⚙️ Printing & Payment Preferences</h3>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Air Waybill (AWB) Copies per Order</label>
              <select class="form-control" id="set_awb_copies">
                <option value="1" ${(settings?.awb_copies || 1) === 1 ? 'selected' : ''}>1 Copy (Consignee Receipt)</option>
                <option value="2" ${settings?.awb_copies === 2 ? 'selected' : ''}>2 Copies (Consignee + Shipper)</option>
                <option value="3" ${settings?.awb_copies === 3 ? 'selected' : ''}>3 Copies (Consignee + Courier + Shipper / A4)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Bank Account Details (For COD Remittance)</label>
              <input type="text" class="form-control" id="set_bank_details" value="${escapeHTML(settings?.bank_details || '')}" placeholder="Bank Name, IBAN / Account Number">
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end;">
          <button type="submit" class="btn btn-primary" id="btn-save-settings" style="padding: 12px 28px;">
            Save Settings 💾
          </button>
        </div>
      </form>
    </div>
  `;

  document.getElementById('form-client-settings')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-save-settings');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      const company = document.getElementById('set_company_name').value.trim();
      const contact = document.getElementById('set_contact_person').value.trim();
      const phone = document.getElementById('set_phone').value.trim();
      const address = document.getElementById('set_business_address').value.trim();
      const city = document.getElementById('set_city').value;
      const returnAddress = document.getElementById('set_return_address').value.trim();
      const awbCopies = parseInt(document.getElementById('set_awb_copies').value, 10);
      const bank = document.getElementById('set_bank_details').value.trim();

      // Upsert client_settings
      const { error: setErr } = await supabase.from('client_settings').upsert({
        client_id: profile.id,
        company_name: company,
        contact_person: contact,
        phone: phone,
        business_address: address,
        city: city,
        return_address: returnAddress,
        awb_copies: awbCopies,
        bank_details: bank,
        updated_at: new Date().toISOString()
      }, { onConflict: 'client_id' });

      if (setErr) throw setErr;

      // Update profiles cache
      await supabase.from('profiles').update({
        company_name: company,
        full_name: contact,
        phone: phone,
        address: address,
        city: city
      }).eq('id', profile.id);

      showToast("Settings updated successfully!", "success");
    } catch (err) {
      console.error("Save settings error:", err);
      showToast(err.message || "Failed to save settings", "error");
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Settings 💾';
    }
  });
}
