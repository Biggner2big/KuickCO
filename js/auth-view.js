// ============================================================================
// QuickCO Authentication Screen (Clean Enterprise Login & Registration)
// ============================================================================

import { signIn, signUp } from './auth.js';
import { showToast } from './shared/utils.js';

export function renderAuthView(container, isRegister = false) {
  container.innerHTML = `
    <div class="auth-wrapper">
      <div class="auth-card">
        <div class="auth-logo">
          <div class="brand-icon">Q</div>
          <div>
            <div class="brand-text" style="color: var(--text-main); font-size: 20px;">QuickCO</div>
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 500; letter-spacing: 0.02em;">Smart Courier & Logistics Management</div>
          </div>
        </div>

        <h2 class="auth-title">${isRegister ? 'Create an Account' : 'Sign In'}</h2>
        <p class="auth-subtitle">${isRegister ? 'Set up your merchant or client portal profile' : 'Enter your credentials to access the portal'}</p>

        <form id="auth-form" autocomplete="on">
          ${isRegister ? `
            <div class="form-group">
              <label class="form-label">Full Name / Company Name</label>
              <input type="text" class="form-control" id="auth-name" placeholder="e.g. Urban Style PK" required autofocus>
            </div>
            <div class="form-group">
              <label class="form-label">Account Type</label>
              <select class="form-control" id="auth-role" required>
                <option value="client" selected>Merchant / Client</option>
                <option value="customer">Customer / Receiver</option>
              </select>
            </div>
          ` : ''}

          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input type="email" class="form-control" id="auth-email" placeholder="name@company.com" required autocomplete="email" ${!isRegister ? 'autofocus' : ''}>
          </div>

          <div class="form-group">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <label class="form-label" style="margin-bottom: 0;">Password</label>
              ${!isRegister ? `<a href="#/track" style="font-size: 11px; color: var(--text-muted);">Track Shipment?</a>` : ''}
            </div>
            <input type="password" class="form-control" id="auth-password" placeholder="••••••••" required autocomplete="current-password">
          </div>

          <button type="submit" class="btn btn-primary" id="btn-auth-submit" style="width: 100%; padding: 12px; font-size: 14px; font-weight: 600; margin-top: 10px; border-radius: var(--radius-md);">
            ${isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div style="text-align: center; margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--surface-border); font-size: 13px; color: var(--text-muted);">
          ${isRegister ? `
            Already have an account? <a href="#/login" style="font-weight: 600; color: var(--primary);">Sign In</a>
          ` : `
            Don't have an account? <a href="#/register" style="font-weight: 600; color: var(--primary);">Register</a>
          `}
        </div>
      </div>
    </div>
  `;

  // Handle form submission
  const form = document.getElementById('auth-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-auth-submit');
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;

    btn.disabled = true;
    btn.textContent = isRegister ? 'Creating account...' : 'Signing in...';

    try {
      if (isRegister) {
        const name = document.getElementById('auth-name').value.trim();
        const role = document.getElementById('auth-role').value;
        const { profile } = await signUp(email, password, role, name);
        routeByRole(profile?.role || role);
      } else {
        const { profile } = await signIn(email, password);
        routeByRole(profile?.role || 'client');
      }
    } catch (err) {
      // Error handled with toast
    } finally {
      btn.disabled = false;
      btn.textContent = isRegister ? 'Create Account' : 'Sign In';
    }
  });
}

export function routeByRole(role) {
  if (role === 'customer') {
    window.location.hash = '#/customer/dashboard';
  } else if (role === 'admin') {
    window.location.hash = '#/admin/dashboard';
  } else {
    window.location.hash = '#/client/dashboard';
  }
}
