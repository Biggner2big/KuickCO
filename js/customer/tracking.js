// ============================================================================
// QuickCO Customer Portal — Live Tracking & Supabase Realtime Engine
// ============================================================================

import { supabase } from '../supabase-client.js';
import { CONFIG } from '../config.js';
import { formatPKR, formatDate, formatDateTime, getStatusBadge, showToast, escapeHTML } from '../shared/utils.js';
import { renderBarcode, renderQRCode } from '../shared/barcode.js';

let activeRealtimeSub = null;

export async function renderTrackingView(container, trackingNumberParam = '') {
  container.innerHTML = `
    <div style="max-width: 800px; margin: 0 auto;">
      <!-- Search Banner -->
      <div class="card" style="margin-bottom: 24px; padding: 28px; text-align: center; background: linear-gradient(135deg, #1e6b3e 0%, #0f2c1b 100%); color: #fff;">
        <h2 style="color: #fff; font-size: 24px; margin-bottom: 6px;">Live Package Tracking</h2>
        <p style="color: rgba(255,255,255,0.8); font-size: 13px; margin-bottom: 20px;">Track your parcel journey across Pakistan in real-time.</p>
        
        <div style="display: flex; gap: 8px; max-width: 520px; margin: 0 auto;">
          <input type="text" id="track-input" class="form-control" placeholder="Enter Tracking Number (e.g. CPK-...)" value="${escapeHTML(trackingNumberParam)}" style="background: #fff; font-size: 15px; font-weight: 600;">
          <button class="btn btn-accent" id="btn-search-track" style="padding: 0 24px; font-weight: 700;">Track 🔍</button>
        </div>
      </div>

      <!-- Realtime Indicator & Status Result -->
      <div id="tracking-result-area">
        ${!trackingNumberParam ? `
          <div class="card" style="text-align: center; padding: 48px; color: var(--text-muted);">
            <div style="font-size: 48px; margin-bottom: 12px;">🚚</div>
            <p style="font-size: 15px;">Please enter your QuickCO tracking number above to see shipment updates.</p>
          </div>
        ` : `<div style="text-align: center; padding: 40px; color: var(--text-muted);">Fetching shipment timeline...</div>`}
      </div>
    </div>
  `;

  document.getElementById('btn-search-track')?.addEventListener('click', () => {
    const tn = document.getElementById('track-input').value.trim();
    if (tn) {
      window.location.hash = `#/track/${tn}`;
    }
  });

  document.getElementById('track-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const tn = document.getElementById('track-input').value.trim();
      if (tn) window.location.hash = `#/track/${tn}`;
    }
  });

  if (trackingNumberParam) {
    await loadShipmentTimeline(trackingNumberParam);
  }
}

async function loadShipmentTimeline(trackingNumber) {
  const resultArea = document.getElementById('tracking-result-area');
  if (!resultArea) return;

  try {
    // 1. Fetch booking record
    const { data: booking, error: bErr } = await supabase
      .from('bookings')
      .select('*')
      .eq('tracking_number', trackingNumber)
      .single();

    if (bErr || !booking) {
      resultArea.innerHTML = `
        <div class="card" style="text-align: center; padding: 40px;">
          <div style="font-size: 40px; margin-bottom: 12px;">⚠️</div>
          <h3 style="color: var(--danger); margin-bottom: 6px;">Shipment Not Found</h3>
          <p style="color: var(--text-muted); font-size: 14px;">No record found for tracking number <strong>${escapeHTML(trackingNumber)}</strong>. Please check and try again.</p>
        </div>
      `;
      return;
    }

    // 2. Fetch tracking events
    const { data: events, error: eErr } = await supabase
      .from('tracking_events')
      .select('*')
      .eq('tracking_number', trackingNumber)
      .order('created_at', { ascending: false });

    renderShipmentDetails(booking, events || []);
    setupRealtimeTracking(booking.tracking_number);
  } catch (err) {
    console.error("Timeline error:", err);
  }
}

function renderShipmentDetails(booking, events) {
  const resultArea = document.getElementById('tracking-result-area');
  if (!resultArea) return;

  const currentStatus = booking.status;
  const stages = [
    { name: 'Booked', icon: '📝' },
    { name: 'Picked Up', icon: '📦' },
    { name: 'In Transit', icon: '🚚' },
    { name: 'Out For Delivery', icon: '🛵' },
    { name: 'Delivered', icon: '✅' }
  ];

  const currentStageIndex = stages.findIndex(s => s.name.toLowerCase() === currentStatus.toLowerCase());

  resultArea.innerHTML = `
    <!-- Top Card: Summary -->
    <div class="card" style="margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
        <div>
          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--accent);">Live Tracking</span>
          <h3 style="font-size: 20px; font-family: var(--font-mono); color: var(--primary); margin: 2px 0;">${escapeHTML(booking.tracking_number)}</h3>
          <div style="font-size: 12px; color: var(--text-muted);">Booked on ${formatDate(booking.booking_date)}</div>
        </div>
        <div style="text-align: right;">
          ${getStatusBadge(booking.status)}
          <div style="font-size: 11px; color: var(--success); margin-top: 4px; display: flex; align-items: center; justify-content: flex-end; gap: 4px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--success); display: inline-block; animation: pulse 2s infinite;"></span>
            Realtime Connected
          </div>
        </div>
      </div>

      <!-- Linear Stepper -->
      <div style="display: flex; justify-content: space-between; position: relative; margin: 32px 10px 24px;">
        <div style="position: absolute; top: 18px; left: 24px; right: 24px; height: 3px; background: #e2e8f0; z-index: 1;"></div>
        ${stages.map((stage, idx) => {
          const isDone = currentStageIndex >= idx;
          const isCurrent = currentStageIndex === idx;
          return `
            <div style="display: flex; flex-direction: column; align-items: center; position: relative; z-index: 2; width: 80px;">
              <div style="width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; background: ${isDone ? 'var(--primary)' : '#fff'}; color: ${isDone ? '#fff' : '#94a3b8'}; border: 2px solid ${isDone ? 'var(--primary)' : '#cbd5e1'}; ${isCurrent ? 'box-shadow: 0 0 0 4px var(--primary-glow);' : ''}">
                ${stage.icon}
              </div>
              <span style="font-size: 11px; font-weight: ${isCurrent ? '700' : '500'}; color: ${isDone ? 'var(--text-main)' : 'var(--text-muted)'}; margin-top: 6px; text-align: center;">${stage.name}</span>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Quick Delivery Details -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; background: #f8fafc; border-radius: 8px; padding: 16px; margin-top: 20px; font-size: 13px;">
        <div>
          <span style="color: var(--text-muted); font-size: 11px; display: block;">DESTINATION</span>
          <strong>${escapeHTML(booking.receiver_city)}</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); font-size: 11px; display: block;">RECIPIENT</span>
          <strong>${escapeHTML(booking.receiver_name)}</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); font-size: 11px; display: block;">COD AMOUNT</span>
          <strong style="color: var(--primary);">${booking.payment_method === 'COD' ? formatPKR(booking.cod_amount) : 'PREPAID'}</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); font-size: 11px; display: block;">WEIGHT</span>
          <strong>${booking.weight || 0.5} kg (${booking.quantity || 1} pcs)</strong>
        </div>
      </div>
    </div>

    <!-- Timeline History -->
    <div class="card">
      <h3 style="font-size: 16px; margin-bottom: 20px;">Detailed Event History</h3>
      <div class="tracking-timeline">
        ${events.length === 0 ? `
          <div style="color: var(--text-muted); font-size: 13px;">No events logged yet.</div>
        ` : events.map((ev, i) => `
          <div class="timeline-step ${i === 0 ? 'active' : 'completed'}">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
              <h4>${escapeHTML(ev.status)} — ${escapeHTML(ev.location || 'Hub')}</h4>
              <p>${escapeHTML(ev.note || 'Shipment scanned')}</p>
              <span style="font-size: 11px; color: var(--text-light);">${formatDateTime(ev.created_at)}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function setupRealtimeTracking(trackingNumber) {
  if (activeRealtimeSub) {
    supabase.removeChannel(activeRealtimeSub);
  }

  activeRealtimeSub = supabase
    .channel(`track-channel-${trackingNumber}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'bookings',
      filter: `tracking_number=eq.${trackingNumber}`
    }, () => {
      showToast("Live shipment update received!", "info");
      loadShipmentTimeline(trackingNumber);
    })
    .subscribe();
}
