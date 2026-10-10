-- ============================================================================
-- QuickCO Courier Management System — Supabase Database Schema
-- Version: 2.0.0
-- Target: PostgreSQL 15+ (Supabase)
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. COUNTERS TABLE (For atomic tracking number generation)
CREATE TABLE IF NOT EXISTS public.counters (
  name TEXT PRIMARY KEY,
  value BIGINT DEFAULT 0
);

INSERT INTO public.counters (name, value)
VALUES ('tracking', 1000)
ON CONFLICT (name) DO NOTHING;

-- 3. PROFILES TABLE (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('client', 'customer', 'admin')),
  full_name TEXT,
  username TEXT UNIQUE,
  phone TEXT,
  email TEXT,
  company_name TEXT,
  address TEXT,
  city TEXT,
  province TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- 4. CLIENT SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.client_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name TEXT,
  contact_person TEXT,
  business_address TEXT,
  return_address TEXT,
  city TEXT,
  email TEXT,
  phone TEXT,
  logo_url TEXT,
  awb_copies INT DEFAULT 1 CHECK (awb_copies BETWEEN 1 AND 3),
  bank_details TEXT,
  notification_email TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id)
);

-- 5. BOOKINGS (ORDERS) TABLE
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_number TEXT UNIQUE NOT NULL,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  booking_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Sender details (Shipper)
  sender_name TEXT,
  sender_company TEXT,
  sender_phone TEXT,
  sender_email TEXT,
  sender_address TEXT,
  sender_city TEXT,

  -- Receiver details (Consignee)
  receiver_name TEXT NOT NULL,
  receiver_phone TEXT NOT NULL,
  receiver_email TEXT,
  receiver_address TEXT NOT NULL,
  receiver_city TEXT NOT NULL,
  receiver_province TEXT,
  receiver_postal_code TEXT,

  -- Parcel details
  parcel_type TEXT DEFAULT 'Standard',
  weight NUMERIC(10,2) DEFAULT 0.5,
  length NUMERIC(10,2) DEFAULT 0,
  width NUMERIC(10,2) DEFAULT 0,
  height NUMERIC(10,2) DEFAULT 0,
  quantity INT DEFAULT 1,
  declared_value NUMERIC(12,2) DEFAULT 0,
  description TEXT,
  special_instructions TEXT,

  -- Financial / Payment details
  cod_amount NUMERIC(12,2) DEFAULT 0,
  delivery_charges NUMERIC(12,2) DEFAULT 0,
  cod_status TEXT DEFAULT 'pending' CHECK (cod_status IN ('pending', 'collected', 'remitted')),
  payment_method TEXT DEFAULT 'COD' CHECK (payment_method IN ('COD', 'Prepaid')),
  collected_at TIMESTAMPTZ,

  -- Status progression
  status TEXT NOT NULL DEFAULT 'Booked' CHECK (status IN (
    'Booked', 'Picked Up', 'In Transit', 'Out For Delivery',
    'Delivered', 'Returned', 'Cancelled'
  )),
  status_history JSONB DEFAULT '[]'::jsonb,

  -- Print flags
  awb_printed BOOLEAN DEFAULT false,
  awb_print_count INT DEFAULT 0,
  label_printed BOOLEAN DEFAULT false,

  -- Ingestion source
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'shopify', 'csv', 'api'))
);

CREATE INDEX IF NOT EXISTS idx_bookings_client ON public.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_tracking ON public.bookings(tracking_number);

-- 6. TRACKING EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  tracking_number TEXT NOT NULL,
  status TEXT NOT NULL,
  location TEXT,
  note TEXT,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracking_events_number ON public.tracking_events(tracking_number);
CREATE INDEX IF NOT EXISTS idx_tracking_events_booking ON public.tracking_events(booking_id);

-- 7. SHOPIFY INTEGRATION TABLES
CREATE TABLE IF NOT EXISTS public.shopify_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shop_domain TEXT,
  access_token TEXT,
  auto_sync BOOLEAN DEFAULT false,
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id)
);

CREATE TABLE IF NOT EXISTS public.shopify_imported_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shopify_order_id TEXT NOT NULL,
  tracking_number TEXT NOT NULL,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, shopify_order_id)
);

-- 8. SYSTEM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function: Atomic Tracking Number Generator (CPK-YYMMDD-HHMMSS-XXXX)
CREATE OR REPLACE FUNCTION public.generate_tracking_number()
RETURNS TEXT AS $$
DECLARE
  new_val BIGINT;
  tn TEXT;
BEGIN
  UPDATE public.counters
  SET value = value + 1
  WHERE name = 'tracking'
  RETURNING value INTO new_val;

  IF NOT FOUND THEN
    INSERT INTO public.counters (name, value) VALUES ('tracking', 1001)
    RETURNING value INTO new_val;
  END IF;

  tn := 'CPK-' || TO_CHAR(NOW() AT TIME ZONE 'Asia/Karachi', 'YYMMDD-HH24MISS') || '-' || LPAD(new_val::TEXT, 4, '0');
  RETURN tn;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function & Trigger: Auto-Update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bookings_updated_at ON public.bookings;
CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Function & Trigger: Create Profile on User Sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_imported_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- PROFILES
DROP POLICY IF EXISTS "Profiles select policy" ON public.profiles;
CREATE POLICY "Profiles select policy" ON public.profiles FOR SELECT
  USING (auth.uid() = id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles;
CREATE POLICY "Profiles update policy" ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- CLIENT SETTINGS
DROP POLICY IF EXISTS "Clients manage own settings" ON public.client_settings;
CREATE POLICY "Clients manage own settings" ON public.client_settings FOR ALL
  USING (auth.uid() = client_id);

-- BOOKINGS
DROP POLICY IF EXISTS "Clients and customers read bookings" ON public.bookings;
CREATE POLICY "Clients and customers read bookings" ON public.bookings FOR SELECT
  USING (
    auth.uid() = client_id
    OR auth.uid() = customer_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Clients create bookings" ON public.bookings;
CREATE POLICY "Clients create bookings" ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "Clients update own bookings" ON public.bookings;
CREATE POLICY "Clients update own bookings" ON public.bookings FOR UPDATE
  USING (auth.uid() = client_id);

DROP POLICY IF EXISTS "Clients delete booked orders" ON public.bookings;
CREATE POLICY "Clients delete booked orders" ON public.bookings FOR DELETE
  USING (auth.uid() = client_id AND status = 'Booked');

-- Public Tracking Read Policy (Allows anyone to track a package by tracking number)
DROP POLICY IF EXISTS "Public can view tracking via tracking number" ON public.bookings;
CREATE POLICY "Public can view tracking via tracking number" ON public.bookings FOR SELECT
  USING (true);

-- TRACKING EVENTS
DROP POLICY IF EXISTS "Tracking events readable by all" ON public.tracking_events;
CREATE POLICY "Tracking events readable by all" ON public.tracking_events FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Clients add tracking events" ON public.tracking_events;
CREATE POLICY "Clients add tracking events" ON public.tracking_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = booking_id
      AND bookings.client_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications FOR ALL
  USING (auth.uid() = user_id);

-- SHOPIFY
DROP POLICY IF EXISTS "Clients manage shopify integrations" ON public.shopify_integrations;
CREATE POLICY "Clients manage shopify integrations" ON public.shopify_integrations FOR ALL
  USING (auth.uid() = client_id);

DROP POLICY IF EXISTS "Clients manage shopify imported orders" ON public.shopify_imported_orders;
CREATE POLICY "Clients manage shopify imported orders" ON public.shopify_imported_orders FOR ALL
  USING (auth.uid() = client_id);
