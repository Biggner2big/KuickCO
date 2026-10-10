# QuickCO — Smart Courier Management Platform

[![Platform](https://img.shields.io/badge/Platform-Web%20SPA-1e6b3e.svg)]()
[![Backend](https://img.shields.io/badge/Backend-Supabase-3ecf8e.svg)]()
[![Database](https://img.shields.io/badge/Database-PostgreSQL-336791.svg)]()
[![License](https://img.shields.io/badge/License-MIT-blue.svg)]()

> Enterprise-grade, zero-build unified courier platform serving dual personas (**Client Portal** for merchants & **Customer Portal** for package consignees) with real-time tracking, barcode printing, and automated air waybills (AWB).

---

## 🚀 Key Features

### 🏢 Client Portal (Merchants & Logistics Operators)
- **Executive Dashboard:** Live shipment metrics, delivery velocity, status distribution, and pending COD calculations.
- **Booking Engine:** Auto-filled shipper defaults, weight & dimensions calculation, automated unique tracking generation (`CPK-YYMMDD-HHMMSS-XXXX`).
- **Barcode & Label Printing:** Scannable CODE128 labels with thermal (100×150mm) and medium (100×75mm) presets.
- **Air Waybill (AWB):** Standard 3-per-A4 format with QR code verification, copy controls, and receiver signature lines.
- **Load Sheet Manifest:** One-click courier handover manifest calculation with total weight and pieces.
- **Shopify & Bulk CSV Sync:** Native CSV importer with automatic column mapping and deduplication guard.
- **Financial & Delivery Reports:** Date-filtered reporting with one-click Excel CSV and PDF exports.

### 📍 Customer Portal (Consignees & Receivers)
- **Live Real-time Tracking:** Interactive timeline (`Booked` ➔ `Picked Up` ➔ `In Transit` ➔ `Out For Delivery` ➔ `Delivered`) powered by Supabase Realtime subscriptions.
- **Self-Service Portal:** Order history, delivery preferences, and payment receipts.
- **Public Tracking Link:** Seamless parcel lookup via `#/track/:tracking_number`.

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, Modern CSS3 (Grid & Variables), Vanilla JavaScript (ES6+ Modules)
- **Backend & Auth:** [Supabase](https://supabase.com/) (PostgreSQL 15+, Auth, Realtime, Storage)
- **Barcode Engine:** JsBarcode (CODE128)
- **QR Code:** qrcodejs
- **Data Ingestion:** PapaParse (CSV engine)
- **Visual Analytics:** Chart.js
- **Document Export:** jsPDF

---

## 📦 Database Setup

1. Open your Supabase Dashboard SQL Editor.
2. Execute the migration script located in [`database/schema.sql`](./database/schema.sql).
3. The script sets up all tables, indexes, triggers, and Row Level Security (RLS) policies.

---

## 💻 Running Locally

No build step or node package manager required:
1. Clone the repository:
   ```bash
   git clone https://github.com/Biggner2big/KuickCO.git
   cd KuickCO
   ```
2. Serve using any local web server (e.g. Python or VS Code Live Server):
   ```bash
   python -m http.server 8000
   ```
3. Open `http://localhost:8000` in your web browser.

---

## 🔐 Default Demo Accounts

| Role | Email | Password |
|---|---|---|
| **Client / Merchant** | `client@quickco.pk` | `client123` |
| **Customer** | `customer@quickco.pk` | `customer123` |
| **Administrator** | `admin@quickco.pk` | `admin123` |
