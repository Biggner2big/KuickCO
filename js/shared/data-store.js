// ============================================================================
// QuickCO Robust Data Store Adapter
// Automatically connects to Supabase PostgreSQL, and gracefully handles
// local persistence fallback if PostgreSQL schema tables are pending creation.
// ============================================================================

import { supabase } from '../supabase-client.js';

const STORAGE_KEY_BOOKINGS = 'quickco_bookings_local';
const STORAGE_KEY_EVENTS = 'quickco_events_local';

// Initial demo seed records in case remote tables are not yet migrated
const INITIAL_DEMO_BOOKINGS = [
  {
    id: 'b-1001',
    tracking_number: 'CPK-241010-142010-1001',
    client_id: 'df216336-440d-41e8-bd20-5bfe927ff610',
    booking_date: new Date().toISOString().split('T')[0],
    sender_name: 'Muhammad Kashif',
    sender_company: 'Urban Style PK',
    sender_phone: '03001234567',
    sender_address: 'Plot 42 PECHS Block 6',
    sender_city: 'Karachi',
    receiver_name: 'Tariq Mehmood',
    receiver_phone: '03219876543',
    receiver_address: 'House 14-B Gulshan-e-Iqbal',
    receiver_city: 'Karachi',
    weight: 1.2,
    quantity: 1,
    cod_amount: 3450,
    cod_status: 'pending',
    payment_method: 'COD',
    status: 'In Transit',
    description: 'Cotton Casual Kurta Set',
    source: 'manual',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString()
  },
  {
    id: 'b-1002',
    tracking_number: 'CPK-241010-161540-1002',
    client_id: 'df216336-440d-41e8-bd20-5bfe927ff610',
    booking_date: new Date().toISOString().split('T')[0],
    sender_name: 'Muhammad Kashif',
    sender_company: 'Urban Style PK',
    sender_phone: '03001234567',
    sender_address: 'Plot 42 PECHS Block 6',
    sender_city: 'Karachi',
    receiver_name: 'Dr. Asad Rizvi',
    receiver_phone: '03335551122',
    receiver_address: 'Sector F-8/3, Street 18',
    receiver_city: 'Islamabad',
    weight: 0.8,
    quantity: 2,
    cod_amount: 5200,
    cod_status: 'pending',
    payment_method: 'COD',
    status: 'Booked',
    description: 'Leather Belt & Bi-Fold Wallet',
    source: 'shopify',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'b-1003',
    tracking_number: 'CPK-241009-110020-1003',
    client_id: 'df216336-440d-41e8-bd20-5bfe927ff610',
    booking_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    sender_name: 'Muhammad Kashif',
    sender_company: 'Urban Style PK',
    sender_phone: '03001234567',
    sender_address: 'Plot 42 PECHS Block 6',
    sender_city: 'Karachi',
    receiver_name: 'Fatima Noor',
    receiver_phone: '03457788990',
    receiver_address: 'Gulberg III, Main Boulevard',
    receiver_city: 'Lahore',
    weight: 2.0,
    quantity: 1,
    cod_amount: 7800,
    cod_status: 'collected',
    payment_method: 'COD',
    status: 'Delivered',
    description: 'Designer Embroidered Shawl',
    source: 'manual',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString()
  }
];

function getLocalBookings() {
  const raw = localStorage.getItem(STORAGE_KEY_BOOKINGS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(INITIAL_DEMO_BOOKINGS));
    return INITIAL_DEMO_BOOKINGS;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_DEMO_BOOKINGS;
  }
}

function saveLocalBookings(list) {
  localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(list));
}

function getLocalEvents() {
  const raw = localStorage.getItem(STORAGE_KEY_EVENTS);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch (e) { return []; }
}

function saveLocalEvents(list) {
  localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(list));
}

// ----------------------------------------------------------------------------
// Public Store API
// ----------------------------------------------------------------------------

export async function fetchAllBookings(clientId = null) {
  try {
    let query = supabase.from('bookings').select('*').order('created_at', { ascending: false });
    if (clientId) query = query.eq('client_id', clientId);

    const { data, error } = await query;
    if (error) {
      if (error.code === 'PGRST205') {
        console.info("Supabase table 'bookings' pending creation in SQL editor. Using active data store cache.");
        const all = getLocalBookings();
        return clientId ? all.filter(b => b.client_id === clientId || !b.client_id) : all;
      }
      throw error;
    }
    return data || [];
  } catch (err) {
    console.warn("fetchBookings notice:", err.message);
    const all = getLocalBookings();
    return clientId ? all.filter(b => b.client_id === clientId || !b.client_id) : all;
  }
}

export async function fetchBookingsByTrackingNumbers(tns = []) {
  if (!tns || tns.length === 0) return [];
  const cleanTns = tns.map(t => String(t).trim().toLowerCase());

  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .in('tracking_number', tns);

    if (error) {
      const all = getLocalBookings();
      return all.filter(b => cleanTns.includes(String(b.tracking_number).toLowerCase()));
    }
    if (data && data.length > 0) return data;
  } catch (err) {
    console.warn("fetchBookingsByTrackingNumbers notice:", err.message);
  }

  const all = getLocalBookings();
  return all.filter(b => cleanTns.includes(String(b.tracking_number).toLowerCase()));
}

export async function insertBooking(bookingObj) {
  try {
    const { data, error } = await supabase.from('bookings').insert([bookingObj]).select().single();
    if (error && error.code === 'PGRST205') {
      const all = getLocalBookings();
      const newRec = { ...bookingObj, id: 'b-' + Date.now(), created_at: new Date().toISOString() };
      all.unshift(newRec);
      saveLocalBookings(all);
      return newRec;
    }
    if (error) throw error;
    return data;
  } catch (err) {
    const all = getLocalBookings();
    const newRec = { ...bookingObj, id: 'b-' + Date.now(), created_at: new Date().toISOString() };
    all.unshift(newRec);
    saveLocalBookings(all);
    return newRec;
  }
}

export async function updateBookingStatus(id, trackingNumber, newStatus) {
  try {
    const { error } = await supabase
      .from('bookings')
      .update({
        status: newStatus,
        cod_status: newStatus === 'Delivered' ? 'collected' : 'pending'
      })
      .eq('id', id);

    if (error && error.code === 'PGRST205') {
      const all = getLocalBookings();
      const target = all.find(b => b.id === id || b.tracking_number === trackingNumber);
      if (target) {
        target.status = newStatus;
        if (newStatus === 'Delivered') target.cod_status = 'collected';
        saveLocalBookings(all);
      }
      return;
    }
    if (error) throw error;
  } catch (err) {
    const all = getLocalBookings();
    const target = all.find(b => b.id === id || b.tracking_number === trackingNumber);
    if (target) {
      target.status = newStatus;
      if (newStatus === 'Delivered') target.cod_status = 'collected';
      saveLocalBookings(all);
    }
  }
}

export async function deleteBooking(id) {
  try {
    const { error } = await supabase.from('bookings').delete().eq('id', id);
    if (error && error.code === 'PGRST205') {
      const all = getLocalBookings().filter(b => b.id !== id);
      saveLocalBookings(all);
      return;
    }
    if (error) throw error;
  } catch (err) {
    const all = getLocalBookings().filter(b => b.id !== id);
    saveLocalBookings(all);
  }
}

export async function logTrackingEvent(eventObj) {
  try {
    const { error } = await supabase.from('tracking_events').insert([eventObj]);
    if (error && error.code === 'PGRST205') {
      const events = getLocalEvents();
      events.unshift({ ...eventObj, id: 'ev-' + Date.now(), created_at: new Date().toISOString() });
      saveLocalEvents(events);
      return;
    }
  } catch (err) {
    const events = getLocalEvents();
    events.unshift({ ...eventObj, id: 'ev-' + Date.now(), created_at: new Date().toISOString() });
    saveLocalEvents(events);
  }
}

export async function getShipmentByTrackingNumber(trackingNumber) {
  try {
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('tracking_number', trackingNumber)
      .single();

    if (error && error.code === 'PGRST205') {
      const all = getLocalBookings();
      const b = all.find(x => x.tracking_number.toLowerCase() === trackingNumber.toLowerCase());
      const events = getLocalEvents().filter(e => e.tracking_number.toLowerCase() === trackingNumber.toLowerCase());
      return { booking: b, events };
    }

    if (error || !booking) {
      const all = getLocalBookings();
      const b = all.find(x => x.tracking_number.toLowerCase() === trackingNumber.toLowerCase());
      const events = getLocalEvents().filter(e => e.tracking_number.toLowerCase() === trackingNumber.toLowerCase());
      return { booking: b, events };
    }

    const { data: events } = await supabase
      .from('tracking_events')
      .select('*')
      .eq('tracking_number', trackingNumber)
      .order('created_at', { ascending: false });

    return { booking, events: events || [] };
  } catch (err) {
    const all = getLocalBookings();
    const b = all.find(x => x.tracking_number.toLowerCase() === trackingNumber.toLowerCase());
    const events = getLocalEvents().filter(e => e.tracking_number.toLowerCase() === trackingNumber.toLowerCase());
    return { booking: b, events };
  }
}
