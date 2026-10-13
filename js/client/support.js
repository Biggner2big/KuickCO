// ============================================================================
// QuickCO Client Portal — Merchant Support & Operations Helpdesk
// ============================================================================

import { getCurrentProfile } from '../auth.js';
import { showToast, escapeHTML } from '../shared/utils.js';

export function renderClientSupport(container) {
  const profile = getCurrentProfile();

  container.innerHTML = `
    <div style="max-width: 900px; margin: 0 auto;">
      <div style="margin-bottom: 24px;">
        <h2>Merchant Support & Operations Desk 🎧</h2>
        <p style="color: var(--text-muted); font-size: 14px;">Dedicated 24/7 logistics helpline, ticket submission, and pickup escalation.</p>
      </div>

      <!-- Quick Contact Channels -->
      <div class="dashboard-grid" style="margin-bottom: 24px;">
        <div class="card stat-card" style="border-left: 4px solid var(--primary);">
          <div>
            <div class="stat-title">Helpline UAN</div>
            <div class="stat-value" style="font-size: 20px;">021-111-QUICK</div>
            <span style="font-size: 12px; color: var(--text-muted);">Mon - Sat (9 AM - 9 PM)</span>
          </div>
          <div class="stat-icon" style="background: var(--primary-light); color: var(--primary); font-size: 20px;">📞</div>
        </div>

        <div class="card stat-card" style="border-left: 4px solid var(--success);">
          <div>
            <div class="stat-title">WhatsApp Merchant Desk</div>
            <div class="stat-value" style="font-size: 20px;">+92 300 1234567</div>
            <span style="font-size: 12px; color: var(--success);">Instant rider & hub updates</span>
          </div>
          <div class="stat-icon" style="background: var(--success-bg); color: var(--success); font-size: 20px;">💬</div>
        </div>

        <div class="card stat-card" style="border-left: 4px solid var(--accent);">
          <div>
            <div class="stat-title">Accounts & COD Remittance</div>
            <div class="stat-value" style="font-size: 18px;">billing@quickco.pk</div>
            <span style="font-size: 12px; color: var(--accent);">Weekly payment reconciliation</span>
          </div>
          <div class="stat-icon" style="background: var(--accent-light); color: var(--accent); font-size: 20px;">💰</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 3fr 2fr; gap: 24px;">
        <!-- Ticket Submission Form -->
        <div class="card">
          <h3 style="font-size: 16px; margin-bottom: 16px;">📩 Submit Support / Escalation Ticket</h3>
          <form id="form-client-ticket">
            <div class="form-group">
              <label class="form-label">Issue Category</label>
              <select class="form-control" id="ticket-category" required>
                <option value="pickup">Rider Pickup Delay</option>
                <option value="delivery">Shipment Delivery Escalation</option>
                <option value="cod">COD Payment / Remittance Query</option>
                <option value="shopify">Shopify Sync Issue</option>
                <option value="damaged">Damage / Loss Claim</option>
                <option value="general">General Operations Inquiry</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Associated Tracking Number (Optional)</label>
              <input type="text" class="form-control" id="ticket-tracking" placeholder="e.g. CPK-241010-142010-1001">
            </div>

            <div class="form-group">
              <label class="form-label">Subject</label>
              <input type="text" class="form-control" id="ticket-subject" placeholder="Brief summary of the issue" required>
            </div>

            <div class="form-group">
              <label class="form-label">Detailed Description</label>
              <textarea class="form-control" id="ticket-message" rows="4" placeholder="Provide full details, order references, or rider notes..." required style="resize: vertical;"></textarea>
            </div>

            <button type="submit" class="btn btn-primary" id="btn-submit-ticket" style="width: 100%; padding: 12px; font-weight: 700;">
              Submit Ticket 🚀
            </button>
          </form>
        </div>

        <!-- FAQs & Hub Guidelines -->
        <div>
          <div class="card" style="margin-bottom: 20px;">
            <h3 style="font-size: 15px; margin-bottom: 12px;">⏰ Pickup Cutoff Times</h3>
            <ul style="font-size: 13px; color: var(--text-muted); padding-left: 20px; line-height: 1.6;">
              <li><strong>Same-Day Dispatch:</strong> Book before 2:00 PM</li>
              <li><strong>Rider Pickup Window:</strong> 3:00 PM – 6:30 PM</li>
              <li><strong>Overnight Inter-City:</strong> Handover before 7:00 PM</li>
            </ul>
          </div>

          <div class="card">
            <h3 style="font-size: 15px; margin-bottom: 12px;">❓ Frequent Inquiries</h3>
            <div style="font-size: 13px; margin-bottom: 10px;">
              <strong style="color: var(--text-main);">When is COD transferred?</strong>
              <p style="color: var(--text-muted); margin-top: 2px;">Twice weekly (Tuesday & Friday) directly to your configured bank IBAN.</p>
            </div>
            <div style="font-size: 13px;">
              <strong style="color: var(--text-main);">How to handle returned parcels?</strong>
              <p style="color: var(--text-muted); margin-top: 2px;">Parcels marked "Returned" after 3 failed delivery attempts are returned within 48 hours.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('form-client-ticket')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const sub = document.getElementById('ticket-subject').value.trim();
    const btn = document.getElementById('btn-submit-ticket');
    btn.disabled = true;
    btn.textContent = 'Submitting...';

    setTimeout(() => {
      showToast(`Support Ticket created! Ref #${Math.floor(100000 + Math.random() * 900000)}`, 'success');
      document.getElementById('form-client-ticket').reset();
      btn.disabled = false;
      btn.textContent = 'Submit Ticket 🚀';
    }, 600);
  });
}
