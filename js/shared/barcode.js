// ============================================================================
// QuickCO Barcode & QR Code Engine
// ============================================================================

import { CONFIG } from '../config.js';

export function renderBarcode(elementOrSelector, text, options = {}) {
  if (!window.JsBarcode) {
    console.error("JsBarcode is not loaded.");
    return;
  }
  try {
    const el = typeof elementOrSelector === 'string' 
      ? document.querySelector(elementOrSelector) 
      : elementOrSelector;
      
    if (!el) return;

    window.JsBarcode(el, text, {
      format: options.format || CONFIG.barcodeFormat || "CODE128",
      width: options.width || 2,
      height: options.height || 50,
      displayValue: options.displayValue !== undefined ? options.displayValue : true,
      fontSize: options.fontSize || 12,
      font: "monospace",
      textAlign: "center",
      textPosition: "bottom",
      textMargin: 2,
      margin: options.margin !== undefined ? options.margin : 5,
      background: options.background || "#ffffff",
      lineColor: options.lineColor || "#000000"
    });
  } catch (err) {
    console.error("Barcode render error:", err);
  }
}

export function renderQRCode(elementOrId, text, size = 80) {
  if (!window.QRCode) {
    console.error("QRCode library is not loaded.");
    return;
  }
  try {
    const target = typeof elementOrId === 'string' 
      ? document.getElementById(elementOrId) 
      : elementOrId;
      
    if (!target) return;
    target.innerHTML = '';
    
    new window.QRCode(target, {
      text: text,
      width: size,
      height: size,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: window.QRCode.CorrectLevel.M
    });
  } catch (err) {
    console.error("QR Code render error:", err);
  }
}
