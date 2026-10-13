// ============================================================================
// QuickCO Customer Portal — Profile Management
// ============================================================================

import { getCurrentProfile, getCurrentUser } from '../auth.js';
import { supabase } from '../supabase-client.js';
import { CONFIG } from '../config.js';
import { showToast, escapeHTML } from '../shared/utils.js';

export function renderCustomerProfile(container) {
  const profile = getCurrentProfile();
  const user = getCurrentUser();

  const fullName = profile?.full_name || '';
  const email = profile?.email || user?.email || '';
  const phone = profile?.phone || '';
  const address = profile?.address || '';
  const city = profile?.city || 'Karachi';

  container.innerHTML = `
    <div style="max-width: 800px; margin: 0 auto;">
      <div style="margin-bottom: 24px;">
        <h2>My Account & Delivery Profile 👤</h2>
        <p style="color: var(--text-muted); font-size: 14px;">Manage your personal contact information and default receiver address.</p>
      </div>

      <form id="form-cust-profile">
        <div class="card" style="margin-bottom: 24px;">
          <h3 style="font-size: 16px; margin-bottom: 16px;">Personal Information</h3>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Full Name</label>
              <input type="text" class="form-control" id="cp-name" value="${escapeHTML(fullName)}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input type="email" class="form-control" value="${escapeHTML(email)}" readonly style="background:#f8fafc;">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Primary Mobile Number</label>
              <input type="tel" class="form-control" id="cp-phone" value="${escapeHTML(phone)}" placeholder="03001234567" required>
            </div>
            <div class="form-group">
              <label class="form-label">City</label>
              <select class="form-control" id="cp-city">
                ${CONFIG.popularCities.map(c => `<option value="${c}" ${c === city ? 'selected' : ''}>${c}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom: 24px;">
          <h3 style="font-size: 16px; margin-bottom: 16px;">Default Home / Delivery Address</h3>
          <div class="form-group">
            <label class="form-label">Street Address & Landmark</label>
            <input type="text" class="form-control" id="cp-address" value="${escapeHTML(address)}" placeholder="House / Flat #, Street, Area">
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end;">
          <button type="submit" class="btn btn-primary" id="btn-save-cust-profile" style="padding: 12px 28px; font-weight: 700;">
            Save Profile 💾
          </button>
        </div>
      </form>
    </div>
  `;

  document.getElementById('form-cust-profile')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-save-cust-profile');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const newName = document.getElementById('cp-name').value.trim();
    const newPhone = document.getElementById('cp-phone').value.trim();
    const newCity = document.getElementById('cp-city').value;
    const newAddress = document.getElementById('cp-address').value.trim();

    try {
      if (profile?.id) {
        await supabase.from('profiles').update({
          full_name: newName,
          phone: newPhone,
          city: newCity,
          address: newAddress
        }).eq('id', profile.id);
      }
      profile.full_name = newName;
      profile.phone = newPhone;
      profile.city = newCity;
      profile.address = newAddress;
      showToast("Profile updated successfully!", "success");
    } catch (err) {
      showToast(err.message || "Saved locally", "info");
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Profile 💾';
    }
  });
}
