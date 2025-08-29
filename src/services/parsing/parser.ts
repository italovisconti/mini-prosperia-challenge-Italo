import { ParsedReceipt, VendorIdentification } from "../../types/receipt.js";
import { logger } from "../../config/logger.js";

export function naiveParse(rawText: string): Partial<ParsedReceipt> {
  const norm = rawText.replace(/\t|\r/g, "").toLowerCase();
  const amount = findNumber(norm, /total\s*[:=]?\s*(\d+[\.,]\d{2})/i);
  const subtotal = findNumber(norm, /(subtotal|sub\s*total)\s*[:=]?\s*(\d+[\.,]\d{2})/i);
  const tax = findNumber(norm, /(iva|itbms|impuesto)\s*[:=]?\s*(\d+[\.,]\d{2})/i);
  // Si no tenemos el tax amount pero si el % (o viceversa), podriamos calcularlo en base subtotal
  const pct = findNumber(norm, /(\d{1,2}[\.,]?\d{0,2})\s*%/i);
  const date = findDate(norm);
  const invoice = findInvoice(norm);
  const vendorName = guessVendorName(rawText);
  const vendorIds = extractVendorIdentifications(norm);

  logger.info({ message: "Naive Parse Result", parseResult: {amount, subtotal, tax, pct, date, invoice, vendorName, vendorIds} });

  return { amount, subtotalAmount: subtotal, taxAmount: tax, taxPercentage: pct, date, invoiceNumber: invoice, vendorName, vendorIdentifications: vendorIds, rawText };
}

function guessVendorName(raw: string): string | null {
  const lines = raw.split(/\n|\r/).map(l=>l.trim()).filter(Boolean);
  return lines[0]?.slice(0,80) || null;
}

// Vendor Identifications no solo necesita el id, tambien el tipo
function extractVendorIdentifications(text: string): VendorIdentification[] {
  const ids: VendorIdentification[] = [];
  // Patrones genéricos para RUC/NIT/CIF (muy básicos)
  const patterns = [
    { type: "RUC", re: /ruc[:\s-]*([a-z0-9-\.]{6,20})/i },
    { type: "NIT", re: /nit[:\s-]*([a-z0-9-\.]{6,20})/i },
    { type: "CIF", re: /cif[:\s-]*([a-z0-9-\.]{6,20})/i }
  ];
  for (const { type, re } of patterns) {
    const m = text.match(re);
    if (m && m[1]) ids.push({ type, value: m[1].toUpperCase() });
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
    const formatted = `${y}-${mth}-${d}`;

    if (!isDateFormatValid(formatted)) {
      logger.warn({ message: "Invalid date format detected", date: formatted });
      return null;
    }

    return formatted;
  }

  if (!isDateFormatValid(val)) {
    logger.warn({ message: "Invalid date format detected", date: val });
    return null;
  }
  return val;
}

function findInvoice(text: string): string | null {
  const m = text.match(/(factura|invoice|n[ºo]\.?|no\.?)[^\w]([a-z0-9-]{4,})/i);
  return m ? (m[2] as string).toUpperCase() : null;
}

function isDateFormatValid(date: string | null): boolean {
  if (!date) return false;
  const parsed = Date.parse(date);
  return !isNaN(parsed);
}