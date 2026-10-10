// ============================================================================
// QuickCO Configuration & Credentials
// ============================================================================

export const CONFIG = {
  appName: "QuickCO",
  tagline: "Smart Courier & Logistics Management",
  currency: "PKR",
  timezone: "Asia/Karachi",
  trackingPrefix: "CPK",
  barcodeFormat: "CODE128",
  
  // Supabase Credentials
  supabaseUrl: "https://fsqkbirmnjasnukqsevx.supabase.co",
  supabasePublishableKey: "sb_publishable_b71468OdeVjQ0FTLGbwebw_TjlM787s",

  // Logistics defaults
  defaultLabelSize: "medium", // small, medium, large, thermal
  defaultAwbCopies: 1,

  // Status progression list
  statuses: [
    "Booked",
    "Picked Up",
    "In Transit",
    "Out For Delivery",
    "Delivered",
    "Returned",
    "Cancelled"
  ],

  // Cities in Pakistan
  popularCities: [
    "Karachi",
    "Lahore",
    "Islamabad",
    "Rawalpindi",
    "Faisalabad",
    "Multan",
    "Peshawar",
    "Quetta",
    "Sialkot",
    "Gujranwala",
    "Hyderabad",
    "Abbottabad"
  ]
};
