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
import { renderCustomerDashboard } from './customer/dashboard.js';
import { renderCustomerOrders } from './customer/orders.js';
import { renderTrackingView } from './customer/tracking.js';
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

  if (hash === '#/login' || hash === '' || hash === '#/') {
    if (user) {
      redirectToRoleDashboard(role);
      return;
    }
    renderAuthView(appEl, false);
    return;
  }

  if (hash === '#/register') {
    if (user) {
      redirectToRoleDashboard(role);
      return;
    }
    renderAuthView(appEl, true);
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

  // Client Portal Routes
  if (routePath === '#/client/dashboard') {
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
  } else {
    // Fallback
    redirectToRoleDashboard(role);
  }
}

function redirectToRoleDashboard(role) {
  if (role === 'customer') {
    window.location.hash = '#/customer/dashboard';
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
          ${role === 'customer' ? `
            <div class="nav-section-title">Customer Services</div>
            <a href="#/customer/dashboard" class="nav-item" id="nav-cust-dashboard">📊 Dashboard</a>
            <a href="#/customer/track" class="nav-item" id="nav-cust-track">🔍 Live Tracking</a>
            <a href="#/customer/orders" class="nav-item" id="nav-cust-orders">📦 My Orders</a>
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

            <div class="nav-section-title">Configuration</div>
            <a href="#/client/settings" class="nav-item" id="nav-client-settings">⚙️ Shipper Settings</a>
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
            <button class="btn btn-primary btn-sm" onclick="window.location.hash='#/client/create'">+ New Order</button>
          </div>
        </header>

        <main class="content-body" id="main-view-container"></main>
      </div>
    </div>
  `;

  document.getElementById('btn-shell-logout')?.addEventListener('click', signOut);
}

function setActiveNav(navId) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById(navId)?.classList.add('active');
}
