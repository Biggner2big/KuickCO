// ============================================================================
// QuickCO Customer Portal — Help & Support Desk
// ============================================================================

import { getCurrentProfile } from '../auth.js';
import { showToast, escapeHTML } from '../shared/utils.js';

export function renderCustomerSupport(container) {
  const profile = getCurrentProfile();

  container.innerHTML = `
    <div style="max-width: 850px; margin: 0 auto;">
      <div style="margin-bottom: 24px;">
        <h2>Receiver Support & Inquiries 💬</h2>
        <p style="color: var(--text-muted); font-size: 14px;">Need help with a package, delivery reschedule, or rider inquiry?</p>
      </div>

      <div class="dashboard-grid" style="margin-bottom: 24px;">
        <div class="card stat-card">
          <div>
            <div class="stat-title">Customer Helpline</div>
            <div class="stat-value" style="font-size: 18px;">021-111-QUICK</div>
            <span style="font-size: 12px; color: var(--text-muted);">Toll free assistance</span>
          </div>
          <div class="stat-icon" style="background: var(--primary-light); color: var(--primary); font-size: 20px;">📞</div>
        </div>

        <div class="card stat-card">
          <div>
            <div class="stat-title">WhatsApp Bot</div>
            <div class="stat-value" style="font-size: 18px;">+92 300 1234567</div>
            <span style="font-size: 12px; color: var(--success);">Instant tracking & status</span>
          </div>
          <div class="stat-icon" style="background: var(--success-bg); color: var(--success); font-size: 20px;">🤖</div>
        </div>

        <div class="card stat-card">
          <div>
            <div class="stat-title">Email Desk</div>
            <div class="stat-value" style="font-size: 18px;">support@quickco.pk</div>
            <span style="font-size: 12px; color: var(--accent);">Average response: 2 hrs</span>
          </div>
          <div class="stat-icon" style="background: var(--accent-light); color: var(--accent); font-size: 20px;">✉️</div>
        </div>
      </div>

      <div class="card">
        <h3 style="font-size: 16px; margin-bottom: 16px;">Request Delivery Assistance</h3>
        <form id="form-cust-support">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Tracking Number (Required)</label>
              <input type="text" class="form-control" id="cs-tracking" placeholder="e.g. CPK-241010-142010-1001" required>
            </div>
            <div class="form-group">
              <label class="form-label">Assistance Type</label>
              <select class="form-control" id="cs-type">
                <option value="reschedule">Reschedule Delivery Date</option>
                <option value="address">Update Delivery Address / Landmark</option>
                <option value="rider">Rider Did Not Call / Inquire Status</option>
                <option value="damaged">Damaged or Incorrect Item</option>
                <option value="complaint">Service Complaint</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Contact Mobile Number</label>
            <input type="tel" class="form-control" id="cs-phone" placeholder="03001234567" required value="${escapeHTML(profile?.phone || '')}">
          </div>

          <div class="form-group">
            <label class="form-label">Message / Details</label>
            <textarea class="form-control" id="cs-msg" rows="4" placeholder="Describe the request or new instructions for the rider..." required></textarea>
          </div>

          <button type="submit" class="btn btn-primary" id="btn-cs-submit" style="width: 100%; padding: 12px; font-weight: 700;">
            Submit Request 📨
          </button>
        </form>
      </div>
    </div>
  `;

  document.getElementById('form-cust-support')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-cs-submit');
    btn.disabled = true;
    btn.textContent = 'Submitting...';

    setTimeout(() => {
      showToast("Support request submitted! Our dispatch desk will contact you shortly.", "success");
      document.getElementById('form-cust-support').reset();
      btn.disabled = false;
      btn.textContent = 'Submit Request 📨';
    }, 600);
  });
}
