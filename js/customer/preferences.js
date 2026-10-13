// ============================================================================
// QuickCO Customer Portal — Delivery Preferences
// ============================================================================

import { getCurrentProfile } from '../auth.js';
import { showToast, escapeHTML } from '../shared/utils.js';

const STORAGE_PREFS_KEY = 'quickco_customer_prefs';

export function renderCustomerPreferences(container) {
  const profile = getCurrentProfile();

  let prefs = {
    timeSlot: 'anytime',
    callBeforeDelivery: true,
    leaveWithNeighbor: false,
    whatsappAlerts: true,
    smsAlerts: true,
    specialInstructions: ''
  };

  try {
    const raw = localStorage.getItem(STORAGE_PREFS_KEY);
    if (raw) prefs = { ...prefs, ...JSON.parse(raw) };
  } catch {}

  container.innerHTML = `
    <div style="max-width: 800px; margin: 0 auto;">
      <div style="margin-bottom: 24px;">
        <h2>Delivery Preferences ⚙️</h2>
        <p style="color: var(--text-muted); font-size: 14px;">Customize how and when riders deliver your packages.</p>
      </div>

      <form id="form-cust-prefs">
        <div class="card" style="margin-bottom: 24px;">
          <h3 style="font-size: 16px; margin-bottom: 16px;">⏰ Preferred Delivery Time Slot</h3>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
            <label style="border: 2px solid ${prefs.timeSlot === 'morning' ? 'var(--primary)' : 'var(--surface-border)'}; border-radius: var(--radius-md); padding: 14px; text-align: center; cursor: pointer; background: ${prefs.timeSlot === 'morning' ? 'var(--primary-light)' : '#fff'};">
              <input type="radio" name="timeSlot" value="morning" ${prefs.timeSlot === 'morning' ? 'checked' : ''} style="display: none;">
              <div style="font-size: 24px; margin-bottom: 4px;">🌅</div>
              <strong style="font-size: 13px; display: block;">Morning</strong>
              <span style="font-size: 11px; color: var(--text-muted);">9:00 AM – 1:00 PM</span>
            </label>

            <label style="border: 2px solid ${prefs.timeSlot === 'afternoon' ? 'var(--primary)' : 'var(--surface-border)'}; border-radius: var(--radius-md); padding: 14px; text-align: center; cursor: pointer; background: ${prefs.timeSlot === 'afternoon' ? 'var(--primary-light)' : '#fff'};">
              <input type="radio" name="timeSlot" value="afternoon" ${prefs.timeSlot === 'afternoon' ? 'checked' : ''} style="display: none;">
              <div style="font-size: 24px; margin-bottom: 4px;">☀️</div>
              <strong style="font-size: 13px; display: block;">Afternoon</strong>
              <span style="font-size: 11px; color: var(--text-muted);">1:00 PM – 5:00 PM</span>
            </label>

            <label style="border: 2px solid ${prefs.timeSlot === 'anytime' ? 'var(--primary)' : 'var(--surface-border)'}; border-radius: var(--radius-md); padding: 14px; text-align: center; cursor: pointer; background: ${prefs.timeSlot === 'anytime' ? 'var(--primary-light)' : '#fff'};">
              <input type="radio" name="timeSlot" value="anytime" ${prefs.timeSlot === 'anytime' ? 'checked' : ''} style="display: none;">
              <div style="font-size: 24px; margin-bottom: 4px;">⚡</div>
              <strong style="font-size: 13px; display: block;">Anytime (Fastest)</strong>
              <span style="font-size: 11px; color: var(--text-muted);">Standard route</span>
            </label>
          </div>
        </div>

        <div class="card" style="margin-bottom: 24px;">
          <h3 style="font-size: 16px; margin-bottom: 16px;">🛵 Rider Delivery Instructions</h3>
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <label style="display: flex; align-items: center; gap: 12px; font-size: 14px; cursor: pointer;">
              <input type="checkbox" id="pref-call" ${prefs.callBeforeDelivery ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--primary);">
              <span><strong>Call 15 minutes before arrival</strong> (Recommended for COD parcels)</span>
            </label>

            <label style="display: flex; align-items: center; gap: 12px; font-size: 14px; cursor: pointer;">
              <input type="checkbox" id="pref-neighbor" ${prefs.leaveWithNeighbor ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--primary);">
              <span><strong>Allow leaving with neighbor or building guard</strong> if unavailable</span>
            </label>

            <div class="form-group" style="margin-top: 10px; margin-bottom: 0;">
              <label class="form-label">Permanent Delivery Notes (Gate code, landmarks, etc.)</label>
              <textarea class="form-control" id="pref-instructions" rows="3" placeholder="e.g. Ring the white doorbell, 2nd floor flat 4-B">${escapeHTML(prefs.specialInstructions)}</textarea>
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom: 24px;">
          <h3 style="font-size: 16px; margin-bottom: 16px;">🔔 Notification Channels</h3>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <label style="display: flex; align-items: center; gap: 12px; font-size: 14px; cursor: pointer;">
              <input type="checkbox" id="pref-whatsapp" ${prefs.whatsappAlerts ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--primary);">
              <span>Send tracking updates and rider live status via <strong>WhatsApp</strong></span>
            </label>
            <label style="display: flex; align-items: center; gap: 12px; font-size: 14px; cursor: pointer;">
              <input type="checkbox" id="pref-sms" ${prefs.smsAlerts ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--primary);">
              <span>Send SMS OTP upon parcel delivery</span>
            </label>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end;">
          <button type="submit" class="btn btn-primary" style="padding: 12px 28px; font-weight: 700;">
            Save Preferences 💾
          </button>
        </div>
      </form>
    </div>
  `;

  // Radio button visual toggle
  document.querySelectorAll('input[name="timeSlot"]').forEach(r => {
    r.addEventListener('change', () => {
      document.querySelectorAll('input[name="timeSlot"]').forEach(other => {
        const parent = other.parentElement;
        if (other.checked) {
          parent.style.borderColor = 'var(--primary)';
          parent.style.background = 'var(--primary-light)';
        } else {
          parent.style.borderColor = 'var(--surface-border)';
          parent.style.background = '#fff';
        }
      });
    });
  });

  // Save form
  document.getElementById('form-cust-prefs')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const checkedSlot = document.querySelector('input[name="timeSlot"]:checked')?.value || 'anytime';
    const updated = {
      timeSlot: checkedSlot,
      callBeforeDelivery: document.getElementById('pref-call').checked,
      leaveWithNeighbor: document.getElementById('pref-neighbor').checked,
      whatsappAlerts: document.getElementById('pref-whatsapp').checked,
      smsAlerts: document.getElementById('pref-sms').checked,
      specialInstructions: document.getElementById('pref-instructions').value.trim()
    };
    localStorage.setItem(STORAGE_PREFS_KEY, JSON.stringify(updated));
    showToast("Delivery preferences updated successfully!", "success");
  });
}
