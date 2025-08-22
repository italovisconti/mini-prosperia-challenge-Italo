import { ParsedReceipt } from "../../types/receipt.js";

export function naiveParse(rawText: string): Partial<ParsedReceipt> {
  const norm = rawText.replace(/\t|\r/g, "").toLowerCase();
  const amount = findNumber(norm, /total\s*[:=]?\s*(\d+[\.,]\d{2})/i);
  const subtotal = findNumber(norm, /(subtotal|sub\s*total)\s*[:=]?\s*(\d+[\.,]\d{2})/i);
  const tax = findNumber(norm, /(iva|itbms|impuesto)\s*[:=]?\s*(\d+[\.,]\d{2})/i);
  const pct = findNumber(norm, /(\d{1,2}[\.,]?\d{0,2})\s*%/i);
  const date = findDate(norm);
  const invoice = findInvoice(norm);
  const vendorName = guessVendorName(rawText);
  const vendorIds = extractVendorIdentifications(norm);
  return { amount, subtotalAmount: subtotal, taxAmount: tax, taxPercentage: pct, date, invoiceNumber: invoice, vendorName, vendorIdentifications: vendorIds, rawText };
}

function guessVendorName(raw: string): string | null {
  const lines = raw.split(/\n|\r/).map(l=>l.trim()).filter(Boolean);
  return lines[0]?.slice(0,80) || null;
}

function extractVendorIdentifications(text: string): string[] {
  const ids: string[] = [];
  // Patrones genéricos para RUC/NIT/CIF (muy básicos)
  const patterns = [ /ruc[:\s-]*([a-z0-9-\.]{6,20})/i, /nit[:\s-]*([a-z0-9-\.]{6,20})/i, /cif[:\s-]*([a-z0-9-\.]{6,20})/i ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) ids.push(m[1].toUpperCase());
  }
  return Array.from(new Set(ids));
}

function findNumber(text: string, re: RegExp): number | null {
  const m = text.match(re);
  return m ? Number(m[1].replace(",", ".")) : null;
}

function findDate(text: string): string | null {
  const m = text.match(/(\d{4}[\/-]\d{2}[\/-]\d{2}|\d{2}[\/-]\d{2}[\/-]\d{4})/);
  if (!m) return null;
  const val = m[1].replace(/\//g, "-");
  if (/^\d{2}-\d{2}-\d{4}$/.test(val)) {
    const [d, mth, y] = val.split("-");
    return `${y}-${mth}-${d}`;
  }
  return val;
}

function findInvoice(text: string): string | null {
  const m = text.match(/(factura|invoice|n[ºo]\.?|no\.?)[^\w]([a-z0-9-]{4,})/i);
  return m ? (m[2] as string).toUpperCase() : null;
}
