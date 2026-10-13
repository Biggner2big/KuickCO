// ============================================================================
// QuickCO Single Page Application Router & Shell Manager
// ============================================================================

import { getCurrentUser, getCurrentProfile, signOut } from './auth.js';
import { renderAuthView } from './auth-view.js';
import { renderClientDashboard } from './client/dashboard.js';
import { renderCreateOrder } from './client/create-order.js';
import { renderClientOrders } from './client/orders.js';
import { renderBarcodeLabels } from './client/labels.js';
import { renderAirWaybills } from './client/awb.js';
import { renderLoadsheet } from './client/loadsheet.js';
import { renderShopifyImport } from './client/shopify.js';
import { renderBulkImport } from './client/bulk.js';
import { renderReports } from './client/reports.js';
import { renderSettings } from './client/settings.js';
import { renderClientSupport } from './client/support.js';
import { renderCustomerDashboard } from './customer/dashboard.js';
import { renderCustomerOrders } from './customer/orders.js';
import { renderTrackingView } from './customer/tracking.js';
import { renderCustomerPreferences } from './customer/preferences.js';
import { renderCustomerInvoices } from './customer/invoices.js';
import { renderCustomerSupport } from './customer/support.js';
import { renderCustomerProfile } from './customer/profile.js';
import { renderAdminDashboard } from './admin/dashboard.js';
import { renderAdminClients } from './admin/clients.js';
import { escapeHTML } from './shared/utils.js';

export function handleRoute() {
  const hash = window.location.hash || '#/login';
  const user = getCurrentUser();
  const profile = getCurrentProfile();
  const role = profile?.role || 'client';

  const appEl = document.getElementById('app');

  // 1. Public Routes
  if (hash.startsWith('#/track')) {
    const parts = hash.split('/');
    const tn = parts[2] ? decodeURIComponent(parts[2].split('?')[0]) : '';
    renderPublicShell(appEl);
    renderTrackingView(document.getElementById('main-view-container'), tn);
    return;
  }

  if (hash === '#/forgot-password') {
    renderAuthView(appEl, 'forgot');
    return;
  }

  if (hash === '#/login' || hash === '' || hash === '#/') {
    if (user) {
      redirectToRoleDashboard(role);
      return;
    }
    renderAuthView(appEl, 'login');
    return;
  }

  if (hash === '#/register') {
    if (user) {
      redirectToRoleDashboard(role);
      return;
    }
    renderAuthView(appEl, 'register');
    return;
  }

  if (hash === '#/otp' || hash === '#/verify-otp') {
    if (user) {
      redirectToRoleDashboard(role);
      return;
    }
    renderAuthView(appEl, 'otp');
    return;
  }

  // 2. Auth Guard
  if (!user) {
    window.location.hash = '#/login';
    return;
  }

  // 3. Authenticated App Shell
  renderAppShell(appEl, profile);
  const viewContainer = document.getElementById('main-view-container');

  // Parse path & params
  const [routePath, queryString] = hash.split('?');
  const queryParams = new URLSearchParams(queryString || '');

  // Admin Routes (Courier Management Operations)
  if (routePath === '#/admin/dashboard' || routePath === '#/admin/orders' || routePath === '#/admin/dispatch') {
    setActiveNav('nav-adm-dashboard');
    renderAdminDashboard(viewContainer);
  } else if (routePath === '#/admin/clients') {
    setActiveNav('nav-adm-clients');
    renderAdminClients(viewContainer);
  }
  // Client Portal Routes (Merchants & Shippers)
  else if (routePath === '#/client/dashboard') {
    setActiveNav('nav-client-dashboard');
    renderClientDashboard(viewContainer);
  } else if (routePath === '#/client/create') {
    setActiveNav('nav-client-create');
    renderCreateOrder(viewContainer);
  } else if (routePath === '#/client/orders') {
    setActiveNav('nav-client-orders');
    renderClientOrders(viewContainer);
  } else if (routePath === '#/client/labels') {
    setActiveNav('nav-client-labels');
    const tns = queryParams.get('tns') ? queryParams.get('tns').split(',') : [];
    renderBarcodeLabels(viewContainer, tns);
  } else if (routePath === '#/client/awb') {
    setActiveNav('nav-client-awb');
    const tns = queryParams.get('tns') ? queryParams.get('tns').split(',') : [];
    renderAirWaybills(viewContainer, tns);
  } else if (routePath === '#/client/loadsheet') {
    setActiveNav('nav-client-loadsheet');
    const tns = queryParams.get('tns') ? queryParams.get('tns').split(',') : [];
    renderLoadsheet(viewContainer, tns);
  } else if (routePath === '#/client/shopify') {
    setActiveNav('nav-client-shopify');
    renderShopifyImport(viewContainer);
  } else if (routePath === '#/client/bulk') {
    setActiveNav('nav-client-bulk');
    renderBulkImport(viewContainer);
  } else if (routePath === '#/client/reports') {
    setActiveNav('nav-client-reports');
    renderReports(viewContainer);
  } else if (routePath === '#/client/settings') {
    setActiveNav('nav-client-settings');
    renderSettings(viewContainer);
  } else if (routePath === '#/client/support') {
    setActiveNav('nav-client-support');
    renderClientSupport(viewContainer);
  } 
  // Customer Portal Routes
  else if (routePath === '#/customer/dashboard') {
    setActiveNav('nav-cust-dashboard');
    renderCustomerDashboard(viewContainer);
  } else if (routePath === '#/customer/orders') {
    setActiveNav('nav-cust-orders');
    renderCustomerOrders(viewContainer);
  } else if (routePath === '#/customer/track') {
    setActiveNav('nav-cust-track');
    const tn = queryParams.get('tn') || '';
    renderTrackingView(viewContainer, tn);
  } else if (routePath === '#/customer/preferences') {
    setActiveNav('nav-cust-prefs');
    renderCustomerPreferences(viewContainer);
  } else if (routePath === '#/customer/invoices') {
    setActiveNav('nav-cust-invoices');
    renderCustomerInvoices(viewContainer);
  } else if (routePath === '#/customer/support') {
    setActiveNav('nav-cust-support');
    renderCustomerSupport(viewContainer);
  } else if (routePath === '#/customer/profile') {
    setActiveNav('nav-cust-profile');
    renderCustomerProfile(viewContainer);
  } else {
    // Fallback
    redirectToRoleDashboard(role);
  }
}

export function redirectToRoleDashboard(role) {
  if (role === 'customer') {
    window.location.hash = '#/customer/dashboard';
  } else if (role === 'admin') {
    window.location.hash = '#/admin/dashboard';
  } else {
    window.location.hash = '#/client/dashboard';
  }
}

function renderPublicShell(container) {
  container.innerHTML = `
    <div style="width: 100%; min-height: 100vh; background: var(--bg); display: flex; flex-direction: column;">
      <header style="height: 65px; background: #fff; border-bottom: 1px solid var(--surface-border); display: flex; align-items: center; justify-content: space-between; padding: 0 32px;">
        <div style="display: flex; align-items: center; gap: 10px; cursor: pointer;" onclick="window.location.hash='#/track'">
          <div class="brand-icon">Q</div>
          <strong style="font-size: 18px; color: var(--text-main);">QuickCO</strong>
          <span class="brand-badge">Tracking</span>
        </div>
        <div>
          <a href="#/login" class="btn btn-secondary btn-sm">Portal Login 🔐</a>
        </div>
      </header>
      <main class="content-body" id="main-view-container"></main>
    </div>
  `;
}

function renderAppShell(container, profile) {
  const isExistingShell = document.getElementById('main-view-container');
  if (isExistingShell) return; // Keep shell, swap view only

  const role = profile?.role || 'client';
  const name = profile?.company_name || profile?.full_name || 'QuickCO Partner';

  container.innerHTML = `
    <div id="app-shell-root" style="display: flex; width: 100%;">
      <!-- Mobile Backdrop -->
      <div class="sidebar-backdrop" id="sidebar-backdrop"></div>

      <!-- Sidebar -->
      <aside class="app-sidebar" id="app-sidebar">
        <div class="sidebar-brand">
          <div class="brand-icon">Q</div>
          <div>
            <div class="brand-text">QuickCO</div>
            <span class="brand-badge">${escapeHTML(role)}</span>
          </div>
        </div>

        <nav class="sidebar-nav">
          ${role === 'admin' ? `
            <div class="nav-section-title">Courier Management</div>
            <a href="#/admin/dashboard" class="nav-item" id="nav-adm-dashboard">🏢 All Client Bookings</a>
            <a href="#/admin/clients" class="nav-item" id="nav-adm-clients">👥 Client Merchants</a>
            
            <div class="nav-section-title">Operational Tools</div>
            <a href="#/client/labels" class="nav-item" id="nav-client-labels">🏷️ Barcode Labels</a>
            <a href="#/client/awb" class="nav-item" id="nav-client-awb">📄 Print AWB (3x)</a>
            <a href="#/track" class="nav-item">🔍 Public Tracker</a>
          ` : role === 'customer' ? `
            <div class="nav-section-title">Customer Services</div>
            <a href="#/customer/dashboard" class="nav-item" id="nav-cust-dashboard">📊 Dashboard</a>
            <a href="#/customer/track" class="nav-item" id="nav-cust-track">🔍 Live Tracking</a>
            <a href="#/customer/orders" class="nav-item" id="nav-cust-orders">📦 My Orders</a>
            <a href="#/customer/invoices" class="nav-item" id="nav-cust-invoices">🧾 Receipts & Invoices</a>
            <a href="#/customer/preferences" class="nav-item" id="nav-cust-prefs">⚙️ Delivery Preferences</a>
            <a href="#/customer/support" class="nav-item" id="nav-cust-support">💬 Help Desk</a>
            <a href="#/customer/profile" class="nav-item" id="nav-cust-profile">👤 Account Profile</a>
          ` : `
            <div class="nav-section-title">Operations</div>
            <a href="#/client/dashboard" class="nav-item" id="nav-client-dashboard">📊 Dashboard</a>
            <a href="#/client/create" class="nav-item" id="nav-client-create">➕ Create Booking</a>
            <a href="#/client/orders" class="nav-item" id="nav-client-orders">📦 Manage Orders</a>
            <a href="#/track" class="nav-item">🔍 Public Tracker</a>

            <div class="nav-section-title">Printing & Dispatch</div>
            <a href="#/client/labels" class="nav-item" id="nav-client-labels">🏷️ Barcode Labels</a>
            <a href="#/client/awb" class="nav-item" id="nav-client-awb">📄 Print AWB (3x)</a>
            <a href="#/client/loadsheet" class="nav-item" id="nav-client-loadsheet">📋 Pickup Manifest</a>

            <div class="nav-section-title">Integrations & Data</div>
            <a href="#/client/shopify" class="nav-item" id="nav-client-shopify">🛍️ Shopify Sync</a>
            <a href="#/client/bulk" class="nav-item" id="nav-client-bulk">📊 Bulk CSV Import</a>
            <a href="#/client/reports" class="nav-item" id="nav-client-reports">📈 Financial Reports</a>

            <div class="nav-section-title">Configuration & Help</div>
            <a href="#/client/settings" class="nav-item" id="nav-client-settings">⚙️ Shipper Settings</a>
            <a href="#/client/support" class="nav-item" id="nav-client-support">🎧 Merchant Support</a>
          `}
        </nav>

        <div class="sidebar-user">
          <div class="user-info">
            <div class="user-avatar">${escapeHTML(name.charAt(0).toUpperCase())}</div>
            <div class="user-meta">
              <h4>${escapeHTML(name)}</h4>
              <p>${escapeHTML(role)}</p>
            </div>
          </div>
          <button id="btn-shell-logout" style="background:none; border:none; color: rgba(255,255,255,0.6); cursor: pointer; font-size: 16px;" title="Logout">🚪</button>
        </div>
      </aside>

      <!-- Main Area -->
      <div class="app-main">
        <header class="app-header">
          <div style="display: flex; align-items: center; gap: 14px;">
            <button class="btn btn-secondary btn-sm" id="btn-toggle-sidebar" style="display: none;">☰</button>
            <div class="header-search">
              <span>🔍</span>
              <input type="text" id="global-search" placeholder="Search orders, tracking #..." onkeydown="if(event.key==='Enter') window.location.hash='#/track/'+this.value.trim()">
            </div>
          </div>
          <div class="header-actions">
            <button class="btn btn-secondary btn-sm" onclick="window.location.hash='#/track'">Live Tracker</button>
            ${role === 'client' ? `<button class="btn btn-primary btn-sm" onclick="window.location.hash='#/client/create'">+ New Order</button>` : ''}
          </div>
        </header>

        <main class="content-body" id="main-view-container"></main>
      </div>
    </div>
  `;


  document.getElementById('btn-shell-logout')?.addEventListener('click', signOut);

  // Mobile sidebar toggle & auto-dismiss
  const toggleBtn = document.getElementById('btn-toggle-sidebar');
  const sidebar = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');

  const closeSidebar = () => {
    sidebar?.classList.remove('open');
    backdrop?.classList.remove('active');
  };

  toggleBtn?.addEventListener('click', () => {
    const isOpen = sidebar?.classList.toggle('open');
    if (isOpen) {
      backdrop?.classList.add('active');
    } else {
      backdrop?.classList.remove('active');
    }
  });

  backdrop?.addEventListener('click', closeSidebar);
  sidebar?.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', closeSidebar);
  });
}

function setActiveNav(navId) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById(navId)?.classList.add('active');
}

