# AGENT.md — QuickCO Courier Management System (Supabase Edition)

## Project Name
**QuickCO** — Smart Courier Management Platform (Client + Customer Portals)

---

## 1. Project Overview

QuickCO is a single web application serving two user types through role-based login:

- **Client Portal** — Courier business owners who create and manage orders
- **Customer Portal** — Receivers who track their own shipments

Both portals share one database, one auth system, and one codebase. Users log in and are automatically routed to their respective dashboards.

**Backend:** Supabase (PostgreSQL + Auth + Realtime + Storage)

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| Backend | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| Realtime | Supabase Realtime (postgres_changes) |
| Storage | Supabase Storage (logos, labels) |
| Barcode | JsBarcode (CDN) |
| QR Code | qrcode.js (CDN) |
| CSV Parsing | PapaParse (CDN) |
| Charts | Chart.js (CDN) |
| PDF Export | jsPDF (CDN) |
| HTTP Client | Supabase JS v2 (CDN) |
| Deployment | Any static host / Vercel / Netlify |

**Delivery:** Single HTML file (or modular). No build step required.

---

## 3. Supabase Configuration

### 3.1 Credentials (Environment)

```env
SUPABASE_URL=https://fsqkbirmnjasnukqsevx.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_b71468OdeVjQ0FTLGbwebw_TjlM787s
SUPABASE_SECRET_KEY=sb_secret_YOUR_SERVICE_ROLE_KEY
SUPABASE_JWKS_URL=https://fsqkbirmnjasnukqsevx.supabase.co/auth/v1/.well-known/jwks.json
```

### 3.2 Client Initialization

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
  const SUPABASE_URL = "https://fsqkbirmnjasnukqsevx.supabase.co";
  const SUPABASE_KEY = "sb_publishable_b71468OdeVjQ0FTLGbwebw_TjlM787s";
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
</script>
```

### 3.3 Security Rules

- **Publishable Key** → Used in frontend (safe for browser)
- **Secret Key** → NEVER exposed in frontend. Only for server-side / Edge Functions.
- All data protection enforced via **Row Level Security (RLS)** policies

---

## 4. User Roles

| Role | Access |
|------|--------|
| `client` | Create orders, print labels, AWB, reports, Shopify import, settings |
| `customer` | View own orders, track shipments, invoices, preferences |
| `admin` | Manage all users, system settings, all orders |

---

## 5. Authentication & Routing

### 5.1 Login Flow

```
User opens app → Login page
    ↓
Enter email + password
    ↓
supabase.auth.signInWithPassword()
    ↓
Fetch user role from profiles table
    ↓
Route based on role:
    client   → #/client/dashboard
    customer → #/customer/dashboard
    admin    → #/admin/dashboard
```

### 5.2 Session Management

```javascript
// Get session
const { data: { session } } = await supabase.auth.getSession();

// Listen for auth changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') routeByRole(session.user.id);
  if (event === 'SIGNED_OUT') showLogin();
});

// Logout
await supabase.auth.signOut();
```

### 5.3 Default Credentials (First Run)

| Role | Email | Password |
|------|-------|----------|
| Client | `client@quickco.pk` | `client123` |
| Customer | `customer@quickco.pk` | `customer123` |
| Admin | `admin@quickco.pk` | `admin123` |

---

## 6. Database Schema (PostgreSQL / Supabase)

### 6.1 Full Schema

```sql
-- ============================================
-- PROFILES (extends auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('client','customer','admin')),
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

-- ============================================
-- CLIENT SETTINGS
-- ============================================
CREATE TABLE client_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
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

-- ============================================
-- BOOKINGS (Orders)
-- ============================================
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_number TEXT UNIQUE NOT NULL,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  booking_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Sender (shipper / client)
  sender_name TEXT,
  sender_company TEXT,
  sender_phone TEXT,
  sender_email TEXT,
  sender_address TEXT,
  sender_city TEXT,

  -- Receiver (consignee)
  receiver_name TEXT NOT NULL,
  receiver_phone TEXT NOT NULL,
  receiver_email TEXT,
  receiver_address TEXT NOT NULL,
  receiver_city TEXT NOT NULL,
  receiver_province TEXT,
  receiver_postal_code TEXT,

  -- Parcel
  parcel_type TEXT DEFAULT 'Standard',
  weight NUMERIC(10,2) DEFAULT 0,
  length NUMERIC(10,2) DEFAULT 0,
  width NUMERIC(10,2) DEFAULT 0,
  height NUMERIC(10,2) DEFAULT 0,
  quantity INT DEFAULT 1,
  declared_value NUMERIC(12,2) DEFAULT 0,
  description TEXT,
  special_instructions TEXT,

  -- Payment
  cod_amount NUMERIC(12,2) DEFAULT 0,
  delivery_charges NUMERIC(12,2) DEFAULT 0,
  cod_status TEXT DEFAULT 'pending' CHECK (cod_status IN ('pending','collected','remitted')),
  payment_method TEXT DEFAULT 'COD' CHECK (payment_method IN ('COD','Prepaid')),
  collected_at TIMESTAMPTZ,

  -- Status
  status TEXT NOT NULL DEFAULT 'Booked' CHECK (status IN (
    'Booked','Picked Up','In Transit','Out For Delivery',
    'Delivered','Returned','Cancelled'
  )),
  status_history JSONB DEFAULT '{}'::jsonb,

  -- Print tracking
  awb_printed BOOLEAN DEFAULT false,
  awb_print_count INT DEFAULT 0,
  label_printed BOOLEAN DEFAULT false,

  -- Source
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual','shopify','csv','api'))
);

CREATE INDEX idx_bookings_client ON bookings(client_id);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_tracking ON bookings(tracking_number);

-- ============================================
-- TRACKING EVENTS
-- ============================================
CREATE TABLE tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  tracking_number TEXT NOT NULL,
  status TEXT NOT NULL,
  location TEXT,
  note TEXT,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tracking_number ON tracking_events(tracking_number);

-- ============================================
-- SHOPIFY INTEGRATION
-- ============================================
CREATE TABLE shopify_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shop_domain TEXT,
  access_token TEXT,
  auto_sync BOOLEAN DEFAULT false,
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id)
);

CREATE TABLE shopify_imported_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shopify_order_id TEXT NOT NULL,
  tracking_number TEXT NOT NULL,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, shopify_order_id)
);

-- ============================================
-- SYSTEM SETTINGS
-- ============================================
CREATE TABLE system_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- ============================================
-- COUNTERS (for tracking number generation)
-- ============================================
CREATE TABLE counters (
  name TEXT PRIMARY KEY,
  value BIGINT DEFAULT 0
);

INSERT INTO counters (name, value) VALUES ('tracking', 0) ON CONFLICT DO NOTHING;
```

### 6.2 Auto-Create Profile on Signup

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 6.3 Tracking Number Generator

```sql
CREATE OR REPLACE FUNCTION generate_tracking_number()
RETURNS TEXT AS $$
DECLARE
  new_val BIGINT;
  tn TEXT;
BEGIN
  UPDATE counters SET value = value + 1 WHERE name = 'tracking'
  RETURNING value INTO new_val;
  tn := 'CPK-' || TO_CHAR(NOW(), 'YYMMDD-HH24MISS') || '-' || LPAD(new_val::TEXT, 4, '0');
  RETURN tn;
END;
$$ LANGUAGE plpgsql;
```

### 6.4 Auto-Update Timestamp

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 7. Row Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============ PROFILES ============
CREATE POLICY "Users view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============ CLIENT SETTINGS ============
CREATE POLICY "Clients manage own settings"
  ON client_settings FOR ALL
  USING (auth.uid() = client_id);

-- ============ BOOKINGS ============
CREATE POLICY "Clients see own bookings"
  ON bookings FOR SELECT
  USING (
    auth.uid() = client_id
    OR auth.uid() = customer_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Clients create bookings"
  ON bookings FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients update own bookings"
  ON bookings FOR UPDATE
  USING (auth.uid() = client_id);

CREATE POLICY "Clients delete booked orders"
  ON bookings FOR DELETE
  USING (auth.uid() = client_id AND status = 'Booked');

-- Public tracking (anyone can view tracking status)
CREATE POLICY "Public can view tracking"
  ON bookings FOR SELECT
  USING (true);

-- ============ TRACKING EVENTS ============
CREATE POLICY "Tracking events readable by all"
  ON tracking_events FOR SELECT
  USING (true);

CREATE POLICY "Clients add tracking events"
  ON tracking_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_id
      AND bookings.client_id = auth.uid()
    )
  );

-- ============ NOTIFICATIONS ============
CREATE POLICY "Users view own notifications"
  ON notifications FOR ALL
  USING (auth.uid() = user_id);
```

---

## 8. Realtime Subscriptions

Supabase Realtime replaces Firebase `.on('value')`.

```javascript
// Subscribe to all bookings for current client
const channel = supabase
  .channel('bookings-client')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'bookings',
      filter: `client_id=eq.${clientId}` },
    (payload) => {
      refreshOrders();
    }
  )
  .subscribe();

// Subscribe to specific booking (tracking page)
const trackChannel = supabase
  .channel(`track-${trackingNumber}`)
  .on('postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'bookings',
      filter: `tracking_number=eq.${trackingNumber}` },
    (payload) => {
      updateTrackingUI(payload.new);
    }
  )
  .subscribe();
```

---

## 9. Pages & Modules

### 9.1 Shared
| Page | Route | Access |
|------|-------|--------|
| Login | `#/login` | Public |
| Register | `#/register` | Public |
| Forgot Password | `#/forgot` | Public |
| Public Tracking | `#/track/:tn` | Public |

### 9.2 Client Portal
| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `#/client/dashboard` | Stats, charts, recent orders |
| Create Order | `#/client/create` | New booking |
| Manage Orders | `#/client/orders` | List, filter, edit, delete |
| Print Labels | `#/client/labels` | Barcode labels |
| Print AWB | `#/client/awb` | Air Waybill |
| Load Sheet | `#/client/loadsheet` | Pickup manifest |
| Shopify Import | `#/client/shopify` | Shopify sync |
| Bulk Import | `#/client/bulk` | CSV upload |
| Reports | `#/client/reports` | Analytics |
| Settings | `#/client/settings` | Profile & shipper info |
| Support | `#/client/support` | Help |

### 9.3 Customer Portal
| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `#/customer/dashboard` | Overview |
| My Orders | `#/customer/orders` | Order history |
| Track Shipment | `#/customer/track` | Live tracking |
| Preferences | `#/customer/preferences` | Address, time slots |
| Invoices | `#/customer/invoices` | Payment history |
| Support | `#/customer/support` | Complaints |
| Profile | `#/customer/profile` | Account |

---

## 10. Barcode System

### 10.1 Label Layout

```
┌─────────────────────────────────────┐
│  QuickCO              [CLIENT LOGO] │
│  ─────────────────────────────────  │
│  TRACKING: CPK-241010-143022-1234   │
│  ─────────────────────────────────  │
│  [         BARCODE IMAGE        ]   │
│  ─────────────────────────────────  │
│  TO: Ahmed Khan                     │
│  0300-1234567                       │
│  House 12, Block B, Gulshan         │
│  Karachi, Sindh                     │
│  ─────────────────────────────────  │
│  FROM: ABC Traders                  │
│  ─────────────────────────────────  │
│  COD: Rs. 5,000                     │
│  Weight: 2.5 kg    Qty: 1           │
│  ─────────────────────────────────  │
│  Date: 10-10-2024                   │
└─────────────────────────────────────┘
```

### 10.2 Barcode Generation

```javascript
JsBarcode("#barcode", booking.tracking_number, {
  format: "CODE128",
  width: 2,
  height: 60,
  displayValue: true,
  fontSize: 12,
  margin: 4
});
```

### 10.3 Label Sizes

| Size | Dimensions | Per A4 |
|------|-----------|--------|
| Small | 100×50 mm | 8 |
| Medium | 100×75 mm | 5 |
| Large | 100×100 mm | 4 |
| Thermal | 100×150 mm | 1 |

---

## 11. Air Waybill (AWB)

### 11.1 Layout — 3 AWBs per A4 page

**Header:** Logo, Company Name, Address, Return Address, Email, Phone

**Tracking:** Number (large), Barcode, QR, Copy indicator ("1 of 3")

**Sender Block:** Name, Phone, Address

**Receiver Block:** Name, Phone, Address, City

**COD Block:** Large bold `COD: Rs. 5,000`

**Parcel Block:** Weight, Qty, Type, Description

**Footer:** Date, Signature line

### 11.2 Copy Control
Setting in client settings: `awb_copies` (1, 2, or 3). Applied automatically on print.

---

## 12. Shopify Integration

### Method A: CSV Import
1. Export from Shopify Admin → Orders → Export CSV
2. Upload to QuickCO
3. Auto-map columns
4. Prevent duplicates (check `shopify_imported_orders`)

**Column Mapping:**
| Shopify | QuickCO |
|---------|---------|
| Name | tracking_ref |
| Shipping Name | receiver_name |
| Shipping Address1 | receiver_address |
| Shipping City | receiver_city |
| Shipping Province | receiver_province |
| Shipping Phone | receiver_phone |
| Total | cod_amount |
| Note | special_instructions |
| Lineitem name | description |
| Lineitem quantity | quantity |
| Lineitem weight | weight |

### Method B: Shopify Admin API
1. Enter shop domain + access token
2. Store in `shopify_integrations`
3. Auto-fetch new orders via scheduled Edge Function
4. Create bookings automatically

**Required Scopes:** `read_orders`, `read_fulfillments`, `read_customers`

---

## 13. Order Workflow

```
Create order → status = "Booked"
    ↓
Print label
    ↓
Courier pickup → "Picked Up"
    ↓
"In Transit"
    ↓
"Out For Delivery"
    ↓
"Delivered" or "Returned"
    ↓
COD collected (if applicable)
```

Every status change inserts a row into `tracking_events`.

---

## 14. Data Flow

### 14.1 Order Creation

```
Client fills form
    ↓
Validate (required fields)
    ↓
Call supabase.rpc('generate_tracking_number')
    ↓
Insert into bookings
    ↓
Insert tracking_events (Booked)
    ↓
Realtime broadcast → all clients see update
    ↓
Show success toast
    ↓
Optionally auto-open label print
```

### 14.2 Tracking

```
User enters tracking number
    ↓
SELECT * FROM bookings WHERE tracking_number = $1
    ↓
SELECT * FROM tracking_events WHERE tracking_number = $1 ORDER BY created_at
    ↓
Render timeline
    ↓
Subscribe to realtime updates on this booking
```

---

## 15. UI/UX Guidelines

### 15.1 Design System

**Colors:**
- Primary: `#1e6b3e`
- Accent: `#d4a843`
- Danger: `#c0392b`
- Success: `#27ae60`
- Info: `#2c7aad`
- Warning: `#e67e22`
- Background: `#f5f7fa`
- Card: `#ffffff`
- Text: `#2c3e50`

**Typography:** Inter / Segoe UI / system-ui

**Spacing:** 4px base (4, 8, 12, 16, 24, 32, 48)

**Radius:** 8px small, 12px medium, 16px large

**Shadows:** `0 2px 12px rgba(0,0,0,0.05)` small, `0 8px 30px rgba(0,0,0,0.1)` large

### 15.2 Responsive Breakpoints
- Mobile: < 640px
- Tablet: 640–900px
- Desktop: > 900px

### 15.3 Components
- Stat cards, data tables, modals, toasts, form groups, badges, charts, barcode labels, AWB cards

---

## 16. Validation Rules

### Order Form
| Field | Rule |
|-------|------|
| Receiver Name | Required, min 2 chars |
| Receiver Phone | Required, 10–15 digits |
| Receiver Address | Required, min 10 chars |
| Receiver City | Required |
| Weight | Required, > 0, < 100 |
| COD | Optional, ≥ 0 |
| Quantity | Required, ≥ 1 |

### Login
| Field | Rule |
|-------|------|
| Email | Valid email |
| Password | Min 6 chars |

---

## 17. Reports & Exports

### Metrics
- Total orders (all-time / monthly / daily)
- Delivered vs returned ratio
- COD pending / collected
- Success rate %
- Top cities, top customers

### Exports
- CSV (UTF-8 BOM for Excel)
- Excel (.xls via TSV)
- PDF (jsPDF)

### Filters
Date range, status, city, customer, payment type

---

## 18. Notifications

### In-App
Insert into `notifications` table → Realtime pushes to UI.

### Email (Optional)
- Supabase Edge Function + Resend / SendGrid
- Triggers: order created, out for delivery, delivered

---

## 19. Security

- Supabase Auth (bcrypt-hashed passwords)
- Row Level Security on every table
- Client sees only own data (RLS enforced)
- Customer sees only own orders
- Secret key NEVER exposed in frontend
- Publishable key safe for browser
- JWT validation via JWKS endpoint

---

## 20. Build Steps (Antigravity)

### Step 1: Initialize
- Create `quickco.html`
- Include CDN: Supabase JS v2, JsBarcode, qrcode.js, PapaParse, Chart.js, jsPDF

### Step 2: Supabase Setup
- Initialize Supabase client
- Setup auth state listener
- Fetch user role on login

### Step 3: Auth System
- Login / register / password reset
- Role-based routing
- Session persistence

### Step 4: Client Portal
- Dashboard, order form (shipper auto-fill), orders list, labels, AWB, load sheet, Shopify import, bulk import, reports, settings

### Step 5: Customer Portal
- Dashboard, order history, tracking, preferences, invoices, support, profile

### Step 6: Barcode
- JsBarcode integration, label template, print CSS, multiple sizes

### Step 7: Testing
- Full E2E flow

---

## 21. File Structure (Modular Option)

```
quickco/
├── index.html
├── css/
│   ├── main.css
│   ├── login.css
│   ├── client.css
│   ├── customer.css
│   └── print.css
├── js/
│   ├── app.js
│   ├── supabase-client.js
│   ├── auth.js
│   ├── router.js
│   ├── client/
│   │   ├── dashboard.js
│   │   ├── orders.js
│   │   ├── labels.js
│   │   ├── awb.js
│   │   └── shopify.js
│   ├── customer/
│   │   ├── dashboard.js
│   │   ├── orders.js
│   │   └── tracking.js
│   └── shared/
│       ├── barcode.js
│       ├── toast.js
│       └── utils.js
├── assets/
│   └── logo.svg
└── AGENT.md
```

---

## 22. Testing Checklist

- [ ] Client login → client dashboard
- [ ] Customer login → customer portal
- [ ] Wrong password → error
- [ ] Create order → saved in Supabase
- [ ] Order appears in real-time
- [ ] Tracking number auto-generated
- [ ] Label prints with scannable barcode
- [ ] AWB prints 3 per A4
- [ ] Load sheet generates
- [ ] Shopify CSV imports
- [ ] Bulk CSV imports
- [ ] Duplicates prevented
- [ ] Search & filters work
- [ ] Status updates reflect in tracking
- [ ] Reports export CSV/Excel
- [ ] RLS prevents cross-client access
- [ ] Customer sees only own orders
- [ ] Shipper auto-fill works
- [ ] Mobile responsive
- [ ] No console errors

---

## 23. Default Configuration

```javascript
const DEFAULT_CONFIG = {
  appName: "QuickCO",
  currency: "PKR",
  timezone: "Asia/Karachi",
  trackingPrefix: "CPK",
  trackingFormat: "CPK-YYMMDD-HHMMSS-XXXX",
  awbCopies: 1,
  barcodeFormat: "CODE128",
  labelSize: "medium",
  supabaseUrl: "https://fsqkbirmnjasnukqsevx.supabase.co",
  supabasePublishableKey: "sb_publishable_b71468OdeVjQ0FTLGbwebw_TjlM787s"
};
```

---

## 24. Success Criteria

1. Both portals work from one app
2. Login routes by role correctly
3. Orders save to Supabase
4. Tracking numbers auto-generate
5. Labels print with scannable barcodes
6. AWBs print 3 per A4
7. Shopify CSV import works
8. Bulk CSV import works
9. Realtime updates across users
10. Reports export to CSV/Excel
11. RLS prevents unauthorized access
12. Shipper auto-fill works
13. Mobile responsive
14. Zero console errors
15. All validations enforced

---

## 25. Deployment

### Option 1: Vercel / Netlify
- Drag & drop HTML
- Instant deployment

### Option 2: Supabase Storage
- Upload to public bucket
- Enable static hosting

### Option 3: Any static host
- Upload single file

**Environment Variables (for server-side):**
```
SUPABASE_URL=https://fsqkbirmnjasnukqsevx.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_b71468OdeVjQ0FTLGbwebw_TjlM787s
SUPABASE_SECRET_KEY=sb_secret_YOUR_SERVICE_ROLE_KEY
```

---

## 26. Notes for AI Agent (Antigravity)

- **Use Supabase JS v2** — not Firebase
- **Realtime via postgres_changes** — not `.on('value')`
- **Never expose secret key** in frontend code
- **RLS enforces security** — do not bypass with service role in browser
- **Always validate forms** before insert
- **Use `generate_tracking_number()` RPC** for unique tracking
- **Insert tracking_events** on every status change
- **Toast feedback** on every async action
- **Loading states** during queries
- **Error handling** — wrap every Supabase call in try/catch
- **Offline detection** — show banner when disconnected
- **Preserve existing working features** — only add, don't break
- **Barcode must be scannable** — test with real scanner
- **Print CSS separate** — use `@media print`
- **Role check before rendering** any page

---

**End of AGENT.md**

*Version: 2.0.0 (Supabase Edition)*
*Project: QuickCO — Smart Courier Management*
*Backend: Supabase (PostgreSQL + Auth + Realtime)*
*Target: Pakistan Courier Industry*