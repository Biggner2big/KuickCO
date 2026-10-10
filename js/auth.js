// ============================================================================
// QuickCO Authentication Engine & Profile Store
// ============================================================================

import { supabase } from './supabase-client.js';
import { showToast } from './shared/utils.js';

let currentUser = null;
let currentProfile = null;

export async function initAuth() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (session?.user) {
    currentUser = session.user;
    currentProfile = await fetchProfile(currentUser.id);
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
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn("Could not fetch profile from DB, generating default session profile:", error.message);
      // Fallback profile if user was created before trigger was initialized
      return {
        id: userId,
        role: currentUser?.user_metadata?.role || 'client',
        full_name: currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0],
        email: currentUser?.email
      };
    }
    return data;
  } catch (e) {
    console.error("fetchProfile error:", e);
    return null;
  }
}

export async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password
    });

    if (error) throw error;

    currentUser = data.user;
    currentProfile = await fetchProfile(currentUser.id);

    showToast(`Welcome back, ${currentProfile?.full_name || 'User'}!`, 'success');
    return { user: currentUser, profile: currentProfile };
  } catch (err) {
    showToast(err.message || 'Login failed', 'error');
    throw err;
  }
}

export async function signUp(email, password, role = 'client', fullName = '') {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
      options: {
        data: {
          role: role,
          full_name: fullName
        }
      }
    });

    if (error) throw error;

    // In case trigger hasn't fired yet or RLS policy requires it
    if (data.user) {
      currentUser = data.user;
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email,
        role: role,
        full_name: fullName
      }).catch(err => console.warn("Auto profile upsert notice:", err));
      currentProfile = await fetchProfile(data.user.id);
    }

    showToast('Registration successful!', 'success');
    return { user: currentUser, profile: currentProfile };
  } catch (err) {
    showToast(err.message || 'Registration failed', 'error');
    throw err;
  }
}

export async function signOut() {
  try {
    await supabase.auth.signOut();
    currentUser = null;
    currentProfile = null;
    showToast('Logged out successfully', 'info');
    window.location.hash = '#/login';
  } catch (err) {
    console.error("SignOut error:", err);
  }
}

export function subscribeAuthChanges(callback) {
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      currentUser = session.user;
      currentProfile = await fetchProfile(session.user.id);
    } else {
      currentUser = null;
      currentProfile = null;
    }
    if (callback) callback(event, { user: currentUser, profile: currentProfile });
  });
}
