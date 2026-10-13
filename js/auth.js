// ============================================================================
// QuickCO Authentication Engine & Profile Store
// Clean Enterprise Auth: Fixed Admin Credential + Client OTP Self-Registration
// ============================================================================

import { supabase } from './supabase-client.js';
import { showToast } from './shared/utils.js';

const LOCAL_SESSION_KEY = 'quickco_auth_session';
const REGISTERED_USERS_KEY = 'quickco_registered_users';
const PENDING_SIGNUP_KEY = 'quickco_pending_signup';

// Dedicated Fixed Admin Credentials
export const ADMIN_CREDENTIALS = {
  username: "admin",
  email: "admin@quickco.pk",
  password: "admin123",
  role: "admin",
  full_name: "Operations Administrator",
  company_name: "QuickCO Central Hub",
  badge: "Admin Hub"
};

let currentUser = null;
let currentProfile = null;
const authSubscribers = [];

// ----------------------------------------------------------------------------
// Local Persistence & Stores
// ----------------------------------------------------------------------------

export function getRegisteredUsers() {
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRegisteredUser(user) {
  try {
    const users = getRegisteredUsers();
    const existingIdx = users.findIndex(u => 
      u.email?.toLowerCase() === user.email?.toLowerCase() || u.id === user.id
    );
    if (existingIdx !== -1) {
      users[existingIdx] = { ...users[existingIdx], ...user };
    } else {
      users.unshift(user);
    }
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn("Error saving registered user locally:", e);
  }
}

export function findRegisteredUser(identifier) {
  if (!identifier) return null;
  const clean = String(identifier).trim().toLowerCase();
  const users = getRegisteredUsers();
  return users.find(u => 
    (u.email && u.email.toLowerCase() === clean) ||
    (u.username && u.username.toLowerCase() === clean)
  );
}

function getLocalSession() {
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocalSession(user, profile) {
  try {
    if (user && profile) {
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({ user, profile }));
    } else {
      localStorage.removeItem(LOCAL_SESSION_KEY);
    }
  } catch (e) {
    console.warn("Storage session write error:", e);
  }
}

// ----------------------------------------------------------------------------
// Auth Initialization & State
// ----------------------------------------------------------------------------

export async function initAuth() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (session?.user) {
      currentUser = session.user;
      currentProfile = await fetchProfile(currentUser.id);
      saveLocalSession(currentUser, currentProfile);
      return { user: currentUser, profile: currentProfile };
    }
  } catch (err) {
    console.warn("Remote session lookup notice:", err);
  }

  // Restore local session (handles admin & offline client sessions)
  const saved = getLocalSession();
  if (saved?.user) {
    currentUser = saved.user;
    currentProfile = saved.profile;
  }
  return { user: currentUser, profile: currentProfile };
}

export function getCurrentUser() {
  return currentUser;
}

export function getCurrentProfile() {
  return currentProfile;
}

export async function fetchProfile(userId) {
  const inferRole = (u) => {
    if (u?.user_metadata?.role) return u.user_metadata.role;
    const em = (u?.email || '').toLowerCase();
    if (em === 'admin@quickco.pk' || em === 'admin') return 'admin';
    if (em.includes('customer')) return 'customer';
    return 'client';
  };

  const fallback = {
    id: userId,
    role: inferRole(currentUser),
    full_name: currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || 'QuickCO Partner',
    company_name: currentUser?.user_metadata?.company_name || '',
    email: currentUser?.email
  };

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return fallback;
    }
    return { ...fallback, ...data };
  } catch (e) {
    return fallback;
  }
}

// ----------------------------------------------------------------------------
// Sign In (Admin & Registered Clients)
// ----------------------------------------------------------------------------

export async function signIn(identifier, password) {
  if (!identifier || !password) {
    throw new Error('Please enter both your email/username and password.');
  }

  const cleanId = String(identifier).trim().toLowerCase();

  // 1. Dedicated Admin Authentication Check
  const isAdminMatch = 
    (cleanId === ADMIN_CREDENTIALS.username || cleanId === ADMIN_CREDENTIALS.email) &&
    password === ADMIN_CREDENTIALS.password;

  if (isAdminMatch) {
    currentUser = {
      id: 'admin-master-uid',
      email: ADMIN_CREDENTIALS.email,
      user_metadata: {
        role: 'admin',
        full_name: ADMIN_CREDENTIALS.full_name,
        company_name: ADMIN_CREDENTIALS.company_name
      }
    };
    currentProfile = {
      id: 'admin-master-uid',
      role: 'admin',
      full_name: ADMIN_CREDENTIALS.full_name,
      company_name: ADMIN_CREDENTIALS.company_name,
      email: ADMIN_CREDENTIALS.email,
      badge: ADMIN_CREDENTIALS.badge
    };
    saveLocalSession(currentUser, currentProfile);
    showToast(`Welcome back, ${ADMIN_CREDENTIALS.full_name}!`, 'success');
    notifyAuthChanges('SIGNED_IN', { user: currentUser, profile: currentProfile });
    return { user: currentUser, profile: currentProfile };
  }

  let remoteError = null;

  // 2. Attempt Supabase Auth (if connected and online)
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanId,
      password: password
    });

    if (error) {
      remoteError = error;
    } else if (data?.user) {
      currentUser = data.user;
      currentProfile = await fetchProfile(currentUser.id);
      saveLocalSession(currentUser, currentProfile);
      showToast(`Welcome back, ${currentProfile?.company_name || currentProfile?.full_name || 'Partner'}!`, 'success');
      notifyAuthChanges('SIGNED_IN', { user: currentUser, profile: currentProfile });
      return { user: currentUser, profile: currentProfile };
    }
  } catch (err) {
    remoteError = err;
  }

  // 3. Fallback to Local Registered Users Store (for self-registered clients)
  const localUser = findRegisteredUser(cleanId);
  if (localUser) {
    if (localUser.password !== password) {
      const err = new Error('Incorrect password. Please verify your credentials.');
      showToast(err.message, 'error');
      throw err;
    }

    currentUser = {
      id: localUser.id,
      email: localUser.email,
      user_metadata: {
        role: localUser.role || 'client',
        full_name: localUser.full_name,
        company_name: localUser.company_name,
        phone: localUser.phone
      }
    };
    currentProfile = {
      id: localUser.id,
      role: localUser.role || 'client',
      full_name: localUser.full_name,
      company_name: localUser.company_name,
      email: localUser.email,
      phone: localUser.phone,
      city: localUser.city || 'Karachi'
    };
    saveLocalSession(currentUser, currentProfile);
    showToast(`Welcome back, ${currentProfile.company_name || currentProfile.full_name}!`, 'success');
    notifyAuthChanges('SIGNED_IN', { user: currentUser, profile: currentProfile });
    return { user: currentUser, profile: currentProfile };
  }

  const errMessage = remoteError?.message || 'Invalid email or password. Please verify your credentials or register.';
  showToast(errMessage, 'error');
  throw new Error(errMessage);
}

// ----------------------------------------------------------------------------
// Client OTP Registration Engine
// ----------------------------------------------------------------------------

export function getPendingSignup() {
  try {
    const raw = localStorage.getItem(PENDING_SIGNUP_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPendingSignup() {
  localStorage.removeItem(PENDING_SIGNUP_KEY);
}

export async function initiateClientSignup({ fullName, companyName, email, phone, city, password }) {
  if (!email || !fullName || !password) {
    throw new Error('Please fill all required registration details.');
  }
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  const cleanEmail = email.trim().toLowerCase();

  // Guard against reserving admin credentials
  if (cleanEmail === ADMIN_CREDENTIALS.email || cleanEmail === 'admin') {
    throw new Error('This email is reserved for system administration.');
  }

  // Check if client is already registered
  const existingUser = findRegisteredUser(cleanEmail);
  if (existingUser) {
    throw new Error('An account with this email already exists. Please sign in instead.');
  }

  // Generate 6-digit numeric verification OTP
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const pendingData = {
    fullName: fullName.trim(),
    companyName: (companyName || fullName).trim(),
    email: cleanEmail,
    phone: (phone || '').trim(),
    city: city || 'Karachi',
    password: password,
    role: 'client',
    otp: otp,
    createdAt: Date.now(),
    expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
  };

  localStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(pendingData));

  // Show realistic simulated notification banner so user has zero roadblocks
  showToast(`📩 OTP Sent! Your 6-digit code is: ${otp}`, 'info', 10000);

  return {
    success: true,
    email: cleanEmail,
    otp: otp
  };
}

export async function resendClientOtp() {
  const pending = getPendingSignup();
  if (!pending) {
    throw new Error('No pending registration found. Please register again.');
  }

  const newOtp = String(Math.floor(100000 + Math.random() * 900000));
  pending.otp = newOtp;
  pending.createdAt = Date.now();
  pending.expiresAt = Date.now() + 10 * 60 * 1000;
  localStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(pending));

  showToast(`📩 New OTP Sent: ${newOtp}`, 'info', 10000);
  return { success: true, otp: newOtp };
}

export async function verifyClientOtp(enteredOtp) {
  const pending = getPendingSignup();
  if (!pending) {
    throw new Error('Registration session expired. Please enter your details again.');
  }

  if (Date.now() > pending.expiresAt) {
    throw new Error('OTP has expired. Please click "Resend Code".');
  }

  const cleanEntered = String(enteredOtp || '').trim();
  if (cleanEntered !== String(pending.otp).trim()) {
    throw new Error('Invalid OTP code. Please enter the correct 6-digit verification code.');
  }

  // OTP verified! Complete client account registration
  return await signUpClient(pending);
}

export async function signUpClient(signupData) {
  const cleanEmail = signupData.email.trim().toLowerCase();
  const userId = 'client-' + Date.now();

  // 1. Save in local registered clients store for guaranteed 100% login persistence
  const registeredClient = {
    id: userId,
    email: cleanEmail,
    password: signupData.password,
    full_name: signupData.fullName,
    company_name: signupData.companyName,
    phone: signupData.phone,
    city: signupData.city,
    role: 'client',
    created_at: new Date().toISOString()
  };
  saveRegisteredUser(registeredClient);

  // 2. Attempt Supabase Auth & Profiles upsert (if online)
  try {
    const { data: suData } = await supabase.auth.signUp({
      email: cleanEmail,
      password: signupData.password,
      options: {
        data: {
          role: 'client',
          full_name: signupData.fullName,
          company_name: signupData.companyName
        }
      }
    });

    const activeId = suData?.user?.id || userId;
    registeredClient.id = activeId;
    saveRegisteredUser(registeredClient);

    await supabase.from('profiles').upsert({
      id: activeId,
      email: cleanEmail,
      role: 'client',
      full_name: signupData.fullName,
      company_name: signupData.companyName,
      phone: signupData.phone,
      city: signupData.city
    });

    await supabase.from('client_settings').upsert({
      client_id: activeId,
      company_name: signupData.companyName,
      contact_person: signupData.fullName,
      email: cleanEmail,
      phone: signupData.phone,
      city: signupData.city
    });
  } catch (err) {
    console.warn("Supabase remote profile sync notice:", err.message);
  }

  // 3. Set Active Session
  currentUser = {
    id: registeredClient.id,
    email: cleanEmail,
    user_metadata: {
      role: 'client',
      full_name: signupData.fullName,
      company_name: signupData.companyName,
      phone: signupData.phone
    }
  };

  currentProfile = {
    id: registeredClient.id,
    email: cleanEmail,
    role: 'client',
    full_name: signupData.fullName,
    company_name: signupData.companyName,
    phone: signupData.phone,
    city: signupData.city,
    badge: 'Merchant'
  };

  saveLocalSession(currentUser, currentProfile);
  clearPendingSignup();

  showToast('Merchant account verified and registered successfully! 🚀', 'success');
  notifyAuthChanges('SIGNED_IN', { user: currentUser, profile: currentProfile });
  return { user: currentUser, profile: currentProfile };
}

// Backward compatible helper
export async function signUp(email, password, role = 'client', fullName = '') {
  return await signUpClient({
    email,
    password,
    role,
    fullName,
    companyName: fullName,
    phone: '',
    city: 'Karachi'
  });
}

// ----------------------------------------------------------------------------
// Sign Out & Client Directory Query
// ----------------------------------------------------------------------------

export async function signOut() {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn("Remote signOut notice:", err);
  }
  currentUser = null;
  currentProfile = null;
  saveLocalSession(null, null);
  showToast('Logged out successfully', 'info');
  notifyAuthChanges('SIGNED_OUT', { user: null, profile: null });
  window.location.hash = '#/login';
}

function notifyAuthChanges(event, payload) {
  authSubscribers.forEach(cb => {
    try { cb(event, payload); } catch (e) { console.error(e); }
  });
}

export function subscribeAuthChanges(callback) {
  if (callback) authSubscribers.push(callback);
  
  try {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        currentUser = session.user;
        currentProfile = await fetchProfile(session.user.id);
        saveLocalSession(currentUser, currentProfile);
      } else if (!getLocalSession()) {
        currentUser = null;
        currentProfile = null;
      }
      if (callback) callback(event, { user: currentUser, profile: currentProfile });
    });
  } catch (err) {
    console.warn("Supabase auth listener subscription notice:", err);
  }
}

// Returns all registered merchants (merging remote profiles & local registered store)
export async function getAllClients() {
  const localClients = getRegisteredUsers().filter(u => u.role === 'client');
  const clientMap = new Map();

  // Populate local clients first
  localClients.forEach(c => {
    clientMap.set(c.email?.toLowerCase(), c);
  });

  try {
    const { data: remoteClients } = await supabase
      .from('profiles')
      .select('id, company_name, full_name, email, city, phone, created_at')
      .eq('role', 'client');

    if (remoteClients && remoteClients.length > 0) {
      remoteClients.forEach(r => {
        const em = r.email?.toLowerCase();
        if (em) {
          clientMap.set(em, { ...clientMap.get(em), ...r });
        }
      });
    }
  } catch (e) {
    console.warn("Remote clients lookup notice:", e);
  }

  return Array.from(clientMap.values());
}
