// ============================================================================
// QuickCO Authentication Screen (Login & Register)
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
            <div class="brand-text" style="color: var(--text-main);">QuickCO</div>
            <div style="font-size: 11px; color: var(--text-muted);">Smart Courier Management</div>
          </div>
        </div>

        <h2 class="auth-title">${isRegister ? 'Create an Account' : 'Welcome to QuickCO'}</h2>
        <p class="auth-subtitle">${isRegister ? 'Register as a merchant or customer' : 'Log in to access your portal'}</p>

        <!-- Quick Demo Accounts Toolbar -->
        ${!isRegister ? `
          <div style="background: #f8fafc; border: 1px solid var(--surface-border); border-radius: var(--radius-md); padding: 12px; margin-bottom: 20px;">
            <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px;">
              ⚡ Quick Demo Login
            </div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-demo-client">Client Portal</button>
              <button type="button" class="btn btn-secondary btn-sm" id="btn-demo-customer">Customer Portal</button>
              <button type="button" class="btn btn-secondary btn-sm" id="btn-demo-admin">Admin Console</button>
            </div>
          </div>
        ` : ''}

        <form id="auth-form">
          ${isRegister ? `
            <div class="form-group">
              <label class="form-label">Full Name / Business Name</label>
              <input type="text" class="form-control" id="auth-name" placeholder="Muhammad Kashif" required>
            </div>
            <div class="form-group">
              <label class="form-label">Account Role</label>
              <select class="form-control" id="auth-role" required>
                <option value="client" selected>Merchant / Shipper (Client Portal)</option>
                <option value="customer">Package Receiver (Customer Portal)</option>
              </select>
            </div>
          ` : ''}

          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input type="email" class="form-control" id="auth-email" placeholder="name@domain.com" required value="${isRegister ? '' : 'client@quickco.pk'}">
          </div>

          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" class="form-control" id="auth-password" placeholder="••••••••" required value="${isRegister ? '' : 'client123'}">
          </div>

          <button type="submit" class="btn btn-primary" id="btn-auth-submit" style="width: 100%; padding: 12px; font-size: 15px; margin-top: 8px;">
            ${isRegister ? 'Complete Registration 🚀' : 'Sign In to Dashboard 🔐'}
          </button>
        </form>

        <div style="text-align: center; margin-top: 24px; font-size: 13px;">
          ${isRegister ? `
            Already have an account? <a href="#/login" style="font-weight: 600;">Sign In</a>
          ` : `
            Need a client or tracking account? <a href="#/register" style="font-weight: 600;">Register Now</a>
          `}
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--surface-border);">
            <a href="#/track" style="color: var(--text-muted); font-size: 12px;">🔍 Public Shipment Tracking</a>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach demo credentials listeners
  if (!isRegister) {
    document.getElementById('btn-demo-client')?.addEventListener('click', () => {
      document.getElementById('auth-email').value = 'client@quickco.pk';
      document.getElementById('auth-password').value = 'client123';
    });
    document.getElementById('btn-demo-customer')?.addEventListener('click', () => {
      document.getElementById('auth-email').value = 'customer@quickco.pk';
      document.getElementById('auth-password').value = 'customer123';
    });
    document.getElementById('btn-demo-admin')?.addEventListener('click', () => {
      document.getElementById('auth-email').value = 'admin@quickco.pk';
      document.getElementById('auth-password').value = 'admin123';
    });
  }

  // Handle form submit
  const form = document.getElementById('auth-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-auth-submit');
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    btn.disabled = true;
    btn.textContent = 'Authenticating...';

    try {
      if (isRegister) {
        const name = document.getElementById('auth-name').value;
        const role = document.getElementById('auth-role').value;
        const { profile } = await signUp(email, password, role, name);
        routeByRole(profile?.role || role);
      } else {
        const { profile } = await signIn(email, password);
        routeByRole(profile?.role || 'client');
      }
    } catch (err) {
      // Handled in auth.js with showToast
    } finally {
      btn.disabled = false;
      btn.textContent = isRegister ? 'Complete Registration 🚀' : 'Sign In to Dashboard 🔐';
    }
  });
}

export function routeByRole(role) {
  if (role === 'customer') {
    window.location.hash = '#/customer/dashboard';
  } else if (role === 'admin') {
    window.location.hash = '#/client/dashboard'; // Or admin console
  } else {
    window.location.hash = '#/client/dashboard';
  }
}
