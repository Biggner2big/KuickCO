// ============================================================================
// QuickCO Client Portal — Create Order Module
// ============================================================================

import { supabase } from '../supabase-client.js';
import { getCurrentProfile } from '../auth.js';
import { CONFIG } from '../config.js';
import { showToast, generateClientTrackingNumber, escapeHTML } from '../shared/utils.js';
import { renderBarcode } from '../shared/barcode.js';

export async function renderCreateOrder(container) {
  const profile = getCurrentProfile();

  // Fetch client settings for shipper auto-fill
  let settings = null;
  if (profile?.id) {
    const { data } = await supabase
      .from('client_settings')
      .select('*')
      .eq('client_id', profile.id)
      .single();
    settings = data;
  }

  const senderName = settings?.contact_person || profile?.full_name || '';
  const senderCompany = settings?.company_name || profile?.company_name || '';
  const senderPhone = settings?.phone || profile?.phone || '';
  const senderAddress = settings?.business_address || profile?.address || '';
  const senderCity = settings?.city || profile?.city || 'Karachi';

  container.innerHTML = `
    <div style="max-width: 900px; margin: 0 auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div>
          <h2>Create New Booking</h2>
          <p style="color: var(--text-muted); font-size: 14px;">Fill in the recipient and parcel details to generate an AWB and tracking label.</p>
        </div>
        <a href="#/client/orders" class="btn btn-secondary">← Back to Orders</a>
      </div>

      <form id="form-create-booking">
        <!-- Section 1: Shipper / Sender Information -->
        <div class="card" style="margin-bottom: 24px;">
          <h3 style="font-size: 16px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            <span>🏢</span> 1. Sender (Shipper) Information
            <span style="font-size: 12px; font-weight: normal; color: var(--text-muted); margin-left: auto;">Auto-filled from settings</span>
          </h3>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Sender Name</label>
              <input type="text" class="form-control" id="sender_name" value="${escapeHTML(senderName)}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Company / Brand</label>
              <input type="text" class="form-control" id="sender_company" value="${escapeHTML(senderCompany)}">
            </div>
            <div class="form-group">
              <label class="form-label">Sender Phone</label>
              <input type="text" class="form-control" id="sender_phone" value="${escapeHTML(senderPhone)}" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group" style="grid-column: span 2;">
              <label class="form-label">Pickup Address</label>
              <input type="text" class="form-control" id="sender_address" value="${escapeHTML(senderAddress)}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Pickup City</label>
              <select class="form-control" id="sender_city" required>
                ${CONFIG.popularCities.map(c => `<option value="${c}" ${c === senderCity ? 'selected' : ''}>${c}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <!-- Section 2: Consignee / Receiver Information -->
        <div class="card" style="margin-bottom: 24px;">
          <h3 style="font-size: 16px; margin-bottom: 16px;"><span>📍</span> 2. Consignee (Receiver) Information</h3>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Customer Full Name *</label>
              <input type="text" class="form-control" id="receiver_name" placeholder="e.g. Tariq Mehmood" required minlength="2">
            </div>
            <div class="form-group">
              <label class="form-label">Customer Mobile Number *</label>
              <input type="tel" class="form-control" id="receiver_phone" placeholder="03001234567" required pattern="[0-9]{10,15}">
            </div>
            <div class="form-group">
              <label class="form-label">Customer Email (Optional)</label>
              <input type="email" class="form-control" id="receiver_email" placeholder="customer@gmail.com">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group" style="grid-column: span 2;">
              <label class="form-label">Complete Delivery Address *</label>
              <input type="text" class="form-control" id="receiver_address" placeholder="House #, Street, Block / Sector, Area" required minlength="10">
            </div>
            <div class="form-group">
              <label class="form-label">Destination City *</label>
              <select class="form-control" id="receiver_city" required>
                <option value="">Select City</option>
                ${CONFIG.popularCities.map(c => `<option value="${c}">${c}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <!-- Section 3: Parcel & Financial Details -->
        <div class="card" style="margin-bottom: 24px;">
          <h3 style="font-size: 16px; margin-bottom: 16px;"><span>📦</span> 3. Parcel & COD Specification</h3>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Weight (kg) *</label>
              <input type="number" step="0.1" class="form-control" id="parcel_weight" value="0.5" min="0.1" max="100" required>
            </div>
            <div class="form-group">
              <label class="form-label">Pieces / Qty *</label>
              <input type="number" class="form-control" id="parcel_qty" value="1" min="1" required>
            </div>
            <div class="form-group">
              <label class="form-label">Payment Type</label>
              <select class="form-control" id="payment_method">
                <option value="COD" selected>Cash on Delivery (COD)</option>
                <option value="Prepaid">Prepaid</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">COD Amount (PKR)</label>
              <input type="number" class="form-control" id="cod_amount" value="1500" min="0">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group" style="grid-column: span 2;">
              <label class="form-label">Product Description</label>
              <input type="text" class="form-control" id="parcel_desc" placeholder="e.g. Men's Leather Wallet & Belt Set">
            </div>
            <div class="form-group">
              <label class="form-label">Special Delivery Instructions</label>
              <input type="text" class="form-control" id="special_instructions" placeholder="e.g. Call before delivery">
            </div>
          </div>
        </div>

        <!-- Section 4: Live Barcode Preview & Submit -->
        <div class="card" style="margin-bottom: 24px; background: #fafbfc; text-align: center;">
          <h4 style="font-size: 13px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px;">Automated Tracking Barcode Preview</h4>
          <svg id="preview-barcode" style="max-width: 280px; height: 50px; margin: 0 auto;"></svg>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;" id="preview-tn-text">A unique CODE128 tracking sequence will be assigned</div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <button type="button" class="btn btn-secondary" onclick="window.location.hash='#/client/orders'">Cancel</button>
          <button type="submit" class="btn btn-primary" id="btn-submit-booking" style="padding: 12px 28px; font-size: 15px;">
            Save & Generate AWB 🚀
          </button>
        </div>
      </form>
    </div>
  `;

  // Render sample barcode
  const sampleTN = generateClientTrackingNumber();
  renderBarcode('#preview-barcode', sampleTN, { height: 40 });
  document.getElementById('preview-tn-text').textContent = `Format preview: ${sampleTN}`;

  // Form submit event
  const form = document.getElementById('form-create-booking');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-booking');
    btn.disabled = true;
    btn.textContent = 'Generating Booking...';

    try {
      await handleCreateOrderSubmit(profile?.id);
    } catch (err) {
      console.error("Order creation error:", err);
      showToast(err.message || 'Failed to create booking', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save & Generate AWB 🚀';
    }
  });
}

async function handleCreateOrderSubmit(clientId) {
  if (!clientId) {
    showToast('Session expired. Please log in again.', 'error');
    return;
  }

  // 1. Generate unique tracking number via RPC or fallback
  let trackingNumber = '';
  try {
    const { data: rpcTn, error: rpcErr } = await supabase.rpc('generate_tracking_number');
    if (!rpcErr && rpcTn) {
      trackingNumber = rpcTn;
    } else {
      trackingNumber = generateClientTrackingNumber();
    }
  } catch (e) {
    trackingNumber = generateClientTrackingNumber();
  }

  const codVal = Number(document.getElementById('cod_amount').value) || 0;
  const payMethod = document.getElementById('payment_method').value;

  const newBooking = {
    client_id: clientId,
    tracking_number: trackingNumber,
    booking_date: new Date().toISOString().split('T')[0],
    
    sender_name: document.getElementById('sender_name').value.trim(),
    sender_company: document.getElementById('sender_company').value.trim(),
    sender_phone: document.getElementById('sender_phone').value.trim(),
    sender_address: document.getElementById('sender_address').value.trim(),
    sender_city: document.getElementById('sender_city').value,

    receiver_name: document.getElementById('receiver_name').value.trim(),
    receiver_phone: document.getElementById('receiver_phone').value.trim(),
    receiver_email: document.getElementById('receiver_email').value.trim() || null,
    receiver_address: document.getElementById('receiver_address').value.trim(),
    receiver_city: document.getElementById('receiver_city').value,

    weight: Number(document.getElementById('parcel_weight').value) || 0.5,
    quantity: Number(document.getElementById('parcel_qty').value) || 1,
    description: document.getElementById('parcel_desc').value.trim(),
    special_instructions: document.getElementById('special_instructions').value.trim(),

    payment_method: payMethod,
    cod_amount: payMethod === 'COD' ? codVal : 0,
    cod_status: 'pending',
    status: 'Booked',
    source: 'manual'
  };

  // 2. Insert Booking
  const { data: booking, error: insertErr } = await supabase
    .from('bookings')
    .insert([newBooking])
    .select()
    .single();

  if (insertErr) throw insertErr;

  // 3. Insert Initial Tracking Event
  await supabase.from('tracking_events').insert([{
    booking_id: booking.id,
    tracking_number: trackingNumber,
    status: 'Booked',
    location: newBooking.sender_city,
    note: 'Shipment created and registered in system'
  }]).catch(e => console.warn("Notice inserting event:", e));

  showToast(`Order created successfully! Tracking: ${trackingNumber}`, 'success');

  // Route to order list and open options
  window.location.hash = `#/client/orders?highlight=${trackingNumber}`;
}
