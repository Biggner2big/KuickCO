// ============================================================================
// QuickCO Authentication Screen (Clean Enterprise Login & Merchant OTP Signup)
// ============================================================================

import { 
  signIn, 
  initiateClientSignup, 
  verifyClientOtp, 
  resendClientOtp, 
  getPendingSignup, 
  clearPendingSignup,
  ADMIN_CREDENTIALS 
} from './auth.js';
import { CONFIG } from './config.js';
import { showToast, escapeHTML } from './shared/utils.js';

let resendTimerInterval = null;

export function renderAuthView(container, mode = 'login') {
  // Clear any existing timer interval
  if (resendTimerInterval) {
    clearInterval(resendTimerInterval);
    resendTimerInterval = null;
  }

  const isRegister = mode === 'register';
  const isForgot = mode === 'forgot';
  const isOtp = mode === 'otp';
  const pending = getPendingSignup();

  // If in OTP mode but no pending signup, redirect to register
  if (isOtp && !pending) {
    window.location.hash = '#/register';
    return;
  }

  container.innerHTML = `
    <div class="auth-wrapper">
      <div class="auth-card">
        <!-- Logo & Header -->
        <div class="auth-logo">
          <div class="brand-icon">Q</div>
          <div>
            <div class="brand-text" style="color: var(--text-main); font-size: 22px; font-weight: 800; line-height: 1.2;">QuickCO</div>
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 600; letter-spacing: 0.03em;">Smart Logistics & Courier Network</div>
          </div>
        </div>

        <!-- Mode Switcher Tabs (Only if not in forgot/otp mode) -->
        ${!isForgot && !isOtp ? `
          <div class="auth-mode-tabs" style="display: flex; background: var(--bg); padding: 4px; border-radius: var(--radius-md); margin-bottom: 22px; border: 1px solid var(--surface-border);">
            <button type="button" class="auth-tab ${!isRegister ? 'active' : ''}" id="tab-login" style="flex: 1; padding: 9px 12px; border: none; background: ${!isRegister ? '#fff' : 'transparent'}; color: ${!isRegister ? 'var(--primary)' : 'var(--text-muted)'}; font-weight: 700; font-size: 13px; border-radius: 6px; cursor: pointer; transition: all 0.2s; box-shadow: ${!isRegister ? 'var(--shadow-sm)' : 'none'};">
              🔑 Sign In
            </button>
            <button type="button" class="auth-tab ${isRegister ? 'active' : ''}" id="tab-register" style="flex: 1; padding: 9px 12px; border: none; background: ${isRegister ? '#fff' : 'transparent'}; color: ${isRegister ? 'var(--primary)' : 'var(--text-muted)'}; font-weight: 700; font-size: 13px; border-radius: 6px; cursor: pointer; transition: all 0.2s; box-shadow: ${isRegister ? 'var(--shadow-sm)' : 'none'};">
              🏢 Merchant Register
            </button>
          </div>
        ` : ''}

        <!-- Dynamic Title & Subtitle -->
        ${isOtp ? `
          <div class="otp-container">
            <div class="otp-icon-wrap">✉️</div>
            <h2 class="auth-title">Verify Your Email</h2>
            <p class="auth-subtitle">
              We sent a 6-digit verification code to<br>
              <strong style="color: var(--text-main);">${escapeHTML(pending?.email || '')}</strong>
            </p>
            <div class="otp-code-pill">
              <span>Code:</span>
              <strong id="disp-otp-code">${pending?.otp || '------'}</strong>
            </div>
          </div>
        ` : isForgot ? `
          <h2 class="auth-title">Reset Your Password</h2>
          <p class="auth-subtitle">Enter your registered email address to receive password reset instructions.</p>
        ` : isRegister ? `
          <h2 class="auth-title">Register Merchant Account</h2>
          <p class="auth-subtitle">Create your business shipping account to dispatch and track packages across Pakistan.</p>
        ` : `
          <h2 class="auth-title">Sign In to QuickCO</h2>
          <p class="auth-subtitle">Enter your credentials to access your courier dispatch console.</p>
        `}

        <!-- Inline Error / Info Notice -->
        <div id="auth-alert" style="display: none; padding: 11px 14px; border-radius: var(--radius-md); font-size: 13px; margin-bottom: 18px; line-height: 1.4;"></div>

        <!-- ========================================== -->
        <!-- FORM: LOGIN MODE                           -->
        <!-- ========================================== -->
        ${!isRegister && !isForgot && !isOtp ? `
          <form id="form-login" autocomplete="on">
            <div class="form-group">
              <label class="form-label">Email Address or Admin Username</label>
              <input type="text" class="form-control" id="login-identifier" placeholder="e.g. admin or name@company.com" required autocomplete="username" autofocus>
            </div>

            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label class="form-label" style="margin-bottom: 0;">Password</label>
                <a href="#/forgot-password" style="font-size: 12px; color: var(--text-muted);">Forgot?</a>
              </div>
              <div style="position: relative; display: flex; align-items: center;">
                <input type="password" class="form-control" id="login-password" placeholder="••••••••" required autocomplete="current-password" style="padding-right: 42px;">
                <button type="button" class="btn-toggle-pwd" data-target="login-password" style="position: absolute; right: 10px; background: none; border: none; cursor: pointer; font-size: 15px; color: var(--text-muted); padding: 4px;" title="Show / hide password">👁️</button>
              </div>
            </div>

            <button type="submit" class="btn btn-primary" id="btn-login-submit" style="width: 100%; padding: 12px; font-size: 14px; font-weight: 700; margin-top: 10px; border-radius: var(--radius-md); box-shadow: 0 4px 12px var(--primary-glow);">
              Sign In to Portal →
            </button>
          </form>

          <div style="text-align: center; margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--surface-border); font-size: 13px; color: var(--text-muted); display: flex; flex-direction: column; gap: 8px;">
            <div>
              New Merchant? <a href="#/register" style="font-weight: 700; color: var(--primary);">Register Merchant Account</a>
            </div>
            <div>
              <a href="#/track" style="font-size: 12px; color: var(--text-muted); text-decoration: underline;">🔍 Track a Parcel without Sign In</a>
            </div>
          </div>
        ` : ''}

        <!-- ========================================== -->
        <!-- FORM: REGISTER MODE (Step 1)              -->
        <!-- ========================================== -->
        ${isRegister ? `
          <form id="form-register" autocomplete="on">
            <div class="form-row">
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Brand / Company Name <span style="color: var(--danger);">*</span></label>
                <input type="text" class="form-control" id="reg-company" placeholder="e.g. Al-Madina Collections" required autofocus>
              </div>
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Contact Person Name <span style="color: var(--danger);">*</span></label>
                <input type="text" class="form-control" id="reg-fullname" placeholder="e.g. Muhammad Kashif" required>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Business Email Address <span style="color: var(--danger);">*</span></label>
              <input type="email" class="form-control" id="reg-email" placeholder="e.g. kashif@urbanstyle.pk" required autocomplete="email">
            </div>

            <div class="form-row">
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Phone / WhatsApp Number <span style="color: var(--danger);">*</span></label>
                <input type="tel" class="form-control" id="reg-phone" placeholder="e.g. 03001234567" required>
              </div>
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Hub City</label>
                <select class="form-control" id="reg-city">
                  ${CONFIG.popularCities.map(c => `<option value="${c}" ${c === 'Karachi' ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Password <span style="color: var(--danger);">*</span></label>
                <div style="position: relative; display: flex; align-items: center;">
                  <input type="password" class="form-control" id="reg-password" placeholder="Min. 6 chars" minlength="6" required style="padding-right: 36px;">
                  <button type="button" class="btn-toggle-pwd" data-target="reg-password" style="position: absolute; right: 8px; background: none; border: none; cursor: pointer; font-size: 14px; color: var(--text-muted);" title="Toggle password">👁️</button>
                </div>
              </div>
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Confirm Password <span style="color: var(--danger);">*</span></label>
                <div style="position: relative; display: flex; align-items: center;">
                  <input type="password" class="form-control" id="reg-confirm-password" placeholder="Repeat password" minlength="6" required style="padding-right: 36px;">
                  <button type="button" class="btn-toggle-pwd" data-target="reg-confirm-password" style="position: absolute; right: 8px; background: none; border: none; cursor: pointer; font-size: 14px; color: var(--text-muted);" title="Toggle password">👁️</button>
                </div>
              </div>
            </div>

            <button type="submit" class="btn btn-primary" id="btn-reg-submit" style="width: 100%; padding: 12px; font-size: 14px; font-weight: 700; margin-top: 10px; border-radius: var(--radius-md); box-shadow: 0 4px 12px var(--primary-glow);">
              Continue & Send Verification OTP ✉️
            </button>
          </form>

          <div style="text-align: center; margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--surface-border); font-size: 13px; color: var(--text-muted);">
            Already have a registered account? <a href="#/login" style="font-weight: 700; color: var(--primary);">Sign In</a>
          </div>
        ` : ''}

        <!-- ========================================== -->
        <!-- FORM: OTP VERIFICATION (Step 2)           -->
        <!-- ========================================== -->
        ${isOtp ? `
          <form id="form-otp">
            <div class="otp-inputs-grid">
              <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" class="otp-digit" id="otp-0" autofocus autocomplete="one-time-code">
              <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" class="otp-digit" id="otp-1">
              <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" class="otp-digit" id="otp-2">
              <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" class="otp-digit" id="otp-3">
              <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" class="otp-digit" id="otp-4">
              <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]*" class="otp-digit" id="otp-5">
            </div>

            <div style="text-align: center; font-size: 13px; color: var(--text-muted); margin-bottom: 18px;">
              Didn't receive the code? 
              <button type="button" id="btn-resend-otp" disabled style="background: none; border: none; color: var(--primary); font-weight: 700; cursor: pointer; padding: 0 4px; text-decoration: underline; font-size: 13px;">
                Resend Code (<span id="resend-countdown">30</span>s)
              </button>
            </div>

            <button type="submit" class="btn btn-primary" id="btn-otp-submit" style="width: 100%; padding: 12px; font-size: 14px; font-weight: 700; border-radius: var(--radius-md); box-shadow: 0 4px 12px var(--primary-glow);">
              Verify & Complete Registration 🚀
            </button>

            <div style="text-align: center; margin-top: 16px;">
              <button type="button" id="btn-otp-back" style="background: none; border: none; font-size: 12.5px; color: var(--text-muted); cursor: pointer;">
                ← Change Email / Back to Registration
              </button>
            </div>
          </form>
        ` : ''}

        <!-- ========================================== -->
        <!-- FORM: FORGOT PASSWORD                      -->
        <!-- ========================================== -->
        ${isForgot ? `
          <form id="form-forgot">
            <div class="form-group">
              <label class="form-label">Registered Email Address</label>
              <input type="email" class="form-control" id="forgot-email" placeholder="name@company.com" required autofocus>
            </div>

            <button type="submit" class="btn btn-primary" id="btn-forgot-submit" style="width: 100%; padding: 12px; font-size: 14px; font-weight: 700; margin-top: 10px; border-radius: var(--radius-md); box-shadow: 0 4px 12px var(--primary-glow);">
              Send Reset Instructions 📧
            </button>
          </form>

          <div style="text-align: center; margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--surface-border); font-size: 13px; color: var(--text-muted);">
            Remembered your credentials? <a href="#/login" style="font-weight: 700; color: var(--primary);">← Back to Sign In</a>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  // Attach interactive listeners
  attachAuthEvents(mode, pending);
}

// ----------------------------------------------------------------------------
// Event Handlers & Form Logic
// ----------------------------------------------------------------------------

function attachAuthEvents(mode, pending) {
  const alertEl = document.getElementById('auth-alert');

  function showAlert(msg, isError = true) {
    if (!alertEl) return;
    alertEl.style.display = 'block';
    alertEl.style.background = isError ? '#fef2f2' : '#f0fdf4';
    alertEl.style.color = isError ? '#991b1b' : '#166534';
    alertEl.style.border = isError ? '1px solid #fecaca' : '1px solid #bbf7d0';
    alertEl.innerHTML = `${isError ? '⚠️ <strong>Notice:</strong> ' : '✅ <strong>Success:</strong> '}${escapeHTML(msg)}`;
  }

  // 1. Tab Listeners
  document.getElementById('tab-login')?.addEventListener('click', () => {
    window.location.hash = '#/login';
  });
  document.getElementById('tab-register')?.addEventListener('click', () => {
    window.location.hash = '#/register';
  });

  // 2. Password show/hide toggle buttons
  document.querySelectorAll('.btn-toggle-pwd').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (input) {
        const isPwd = input.type === 'password';
        input.type = isPwd ? 'text' : 'password';
        btn.textContent = isPwd ? '🙈' : '👁️';
      }
    });
  });

  // 3. Login Form Submission
  const loginForm = document.getElementById('form-login');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const identifier = document.getElementById('login-identifier').value.trim();
      const password = document.getElementById('login-password').value;
      const btn = document.getElementById('btn-login-submit');

      alertEl.style.display = 'none';
      btn.disabled = true;
      btn.textContent = 'Signing in...';

      try {
        const { profile } = await signIn(identifier, password);
        routeByRole(profile?.role || 'client');
      } catch (err) {
        showAlert(err.message || 'Unable to authenticate. Please check your credentials.');
        btn.disabled = false;
        btn.textContent = 'Sign In to Portal →';
      }
    });
  }

  // 4. Registration Form (Step 1) Submission -> Initiates OTP
  const regForm = document.getElementById('form-register');
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const company = document.getElementById('reg-company').value.trim();
      const fullName = document.getElementById('reg-fullname').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const phone = document.getElementById('reg-phone').value.trim();
      const city = document.getElementById('reg-city').value;
      const password = document.getElementById('reg-password').value;
      const confirmPwd = document.getElementById('reg-confirm-password').value;
      const btn = document.getElementById('btn-reg-submit');

      alertEl.style.display = 'none';

      if (password !== confirmPwd) {
        showAlert('Passwords do not match. Please ensure both passwords match.');
        return;
      }

      if (password.length < 6) {
        showAlert('Password must be at least 6 characters.');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Sending OTP code...';

      try {
        await initiateClientSignup({
          fullName,
          companyName: company,
          email,
          phone,
          city,
          password
        });

        // Switch to OTP Verification Screen via hash
        window.location.hash = '#/otp';
      } catch (err) {
        showAlert(err.message || 'Failed to initiate registration.');
        btn.disabled = false;
        btn.textContent = 'Continue & Send Verification OTP ✉️';
      }
    });
  }

  // 5. OTP Verification (Step 2) Handlers
  const otpForm = document.getElementById('form-otp');
  if (otpForm) {
    const digitInputs = [
      document.getElementById('otp-0'),
      document.getElementById('otp-1'),
      document.getElementById('otp-2'),
      document.getElementById('otp-3'),
      document.getElementById('otp-4'),
      document.getElementById('otp-5')
    ];

    // Auto-focus first digit
    digitInputs[0]?.focus();

    // Auto-advance and backspace handling
    digitInputs.forEach((input, index) => {
      if (!input) return;

      input.addEventListener('input', (e) => {
        const val = e.target.value.replace(/[^0-9]/g, '');
        e.target.value = val ? val[0] : '';

        if (val && index < 5) {
          digitInputs[index + 1]?.focus();
        }

        // Auto submit if all 6 digits entered
        const fullCode = digitInputs.map(inp => inp.value).join('');
        if (fullCode.length === 6) {
          submitOtp(fullCode);
        }
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !input.value && index > 0) {
          digitInputs[index - 1]?.focus();
        }
      });

      // Handle paste event (e.g. pasting 6-digit code)
      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData).getData('text').trim();
        const digits = pasted.replace(/[^0-9]/g, '').slice(0, 6);
        if (digits) {
          digits.split('').forEach((d, i) => {
            if (digitInputs[i]) digitInputs[i].value = d;
          });
          if (digits.length === 6) {
            digitInputs[5]?.focus();
            submitOtp(digits);
          } else if (digitInputs[digits.length]) {
            digitInputs[digits.length].focus();
          }
        }
      });
    });

    // Back to registration button
    document.getElementById('btn-otp-back')?.addEventListener('click', () => {
      clearPendingSignup();
      window.location.hash = '#/register';
    });

    // Start 30s resend countdown
    startResendCountdown();

    // Resend OTP button
    document.getElementById('btn-resend-otp')?.addEventListener('click', async () => {
      const resendBtn = document.getElementById('btn-resend-otp');
      resendBtn.disabled = true;
      try {
        const { otp } = await resendClientOtp();
        const codeDisplay = document.getElementById('disp-otp-code');
        if (codeDisplay) codeDisplay.textContent = otp;
        showAlert(`New 6-digit OTP dispatched: ${otp}`, false);
        startResendCountdown();
      } catch (err) {
        showAlert(err.message || 'Failed to resend code.');
        resendBtn.disabled = false;
      }
    });

    // Submit OTP manually via button
    otpForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fullCode = digitInputs.map(inp => inp.value).join('');
      submitOtp(fullCode);
    });

    async function submitOtp(enteredCode) {
      if (enteredCode.length !== 6) {
        showAlert('Please enter the complete 6-digit code.');
        return;
      }

      const btn = document.getElementById('btn-otp-submit');
      alertEl.style.display = 'none';
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Verifying code...';
      }

      try {
        const { profile } = await verifyClientOtp(enteredCode);
        routeByRole(profile?.role || 'client');
      } catch (err) {
        showAlert(err.message || 'Invalid code. Please check and try again.');
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Verify & Complete Registration 🚀';
        }
      }
    }
  }

  // 6. Forgot Password Form
  const forgotForm = document.getElementById('form-forgot');
  if (forgotForm) {
    forgotForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('forgot-email').value.trim();
      const btn = document.getElementById('btn-forgot-submit');
      btn.disabled = true;
      btn.textContent = 'Sending...';

      setTimeout(() => {
        showAlert(`Password reset instructions have been sent to ${email} if registered.`, false);
        btn.disabled = false;
        btn.textContent = 'Send Reset Instructions 📧';
      }, 700);
    });
  }
}

// ----------------------------------------------------------------------------
// Resend Timer Countdown
// ----------------------------------------------------------------------------

function startResendCountdown() {
  let seconds = 30;
  const resendBtn = document.getElementById('btn-resend-otp');
  const countdownSpan = document.getElementById('resend-countdown');

  if (resendTimerInterval) {
    clearInterval(resendTimerInterval);
  }

  if (resendBtn) resendBtn.disabled = true;

  resendTimerInterval = setInterval(() => {
    seconds--;
    if (countdownSpan) countdownSpan.textContent = seconds;

    if (seconds <= 0) {
      clearInterval(resendTimerInterval);
      resendTimerInterval = null;
      if (resendBtn) {
        resendBtn.disabled = false;
        resendBtn.innerHTML = 'Resend Code Now';
      }
    }
  }, 1000);
}

// ----------------------------------------------------------------------------
// Role-Based Router
// ----------------------------------------------------------------------------

export function routeByRole(role) {
  const r = (role || 'client').toLowerCase();
  if (r === 'admin') {
    window.location.hash = '#/admin/dashboard';
  } else if (r === 'customer') {
    window.location.hash = '#/customer/dashboard';
  } else {
    window.location.hash = '#/client/dashboard';
  }
}
