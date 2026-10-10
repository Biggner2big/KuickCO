// ============================================================================
// QuickCO — Master Application Entry Point
// ============================================================================

import { initAuth, subscribeAuthChanges } from './auth.js';
import { handleRoute } from './router.js';
import { showToast } from './shared/utils.js';

async function bootstrap() {
  console.log("Initializing QuickCO Courier Management System...");

  // 1. Offline & Online Network Detection
  window.addEventListener('online', () => showToast("Connection restored", "success"));
  window.addEventListener('offline', () => showToast("You are offline. Reconnecting...", "warning"));

  // 2. Initialize Session
  try {
    await initAuth();
  } catch (err) {
    console.warn("Auth initialization note:", err);
  }

  // 3. Listen for Auth Changes & Sync Router
  subscribeAuthChanges((event, { user, profile }) => {
    // If sign out or sign in, route appropriately
    if (event === 'SIGNED_OUT') {
      window.location.hash = '#/login';
    }
  });

  // 4. Hash Change Listener
  window.addEventListener('hashchange', () => {
    handleRoute();
  });

  // 5. Initial Route Execution
  handleRoute();
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
