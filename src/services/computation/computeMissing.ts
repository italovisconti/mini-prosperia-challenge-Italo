import { ComputedFields } from "../../types/computedFields";

/**
 * Compute missing fields based on the provided ones.
 * Useful to calculate financial when some fields are missing.
 * @param fields - The fields to compute missing values for.
 * @returns The computed fields with missing values filled in.
 */
export function computeMissing(fields: ComputedFields): ComputedFields {
  const toTwoDecimals = (v: number) => Math.round(v * 100) / 100;
  let { amount, subtotalAmount, taxAmount, taxPercentage } = fields;

  if (taxPercentage != null && taxPercentage > 1) {
    taxPercentage /= 100;
  }

  // Case 1: amount + taxPercentage
  if (amount != null && taxPercentage != null && subtotalAmount == null && taxAmount == null) {
    subtotalAmount = toTwoDecimals(amount / (1 + taxPercentage));
    taxAmount = toTwoDecimals(amount - subtotalAmount);
  }
  // Case 2: amount + taxAmount
  else if (amount != null && taxAmount != null && subtotalAmount == null) {
    subtotalAmount = toTwoDecimals(amount - taxAmount);
    if (subtotalAmount !== 0) {
      taxPercentage = toTwoDecimals(taxAmount / subtotalAmount);
    }
  }
  // Case 3: subtotal + taxPercentage
  else if (subtotalAmount != null && taxPercentage != null && taxAmount == null && amount == null) {
    taxAmount = toTwoDecimals(subtotalAmount * taxPercentage);
    amount = toTwoDecimals(subtotalAmount + taxAmount);
  }
  // Case 4: subtotal + taxAmount
  else if (subtotalAmount != null && taxAmount != null && amount == null) {
    amount = toTwoDecimals(subtotalAmount + taxAmount);
    if (subtotalAmount !== 0) {
      taxPercentage = toTwoDecimals(taxAmount / subtotalAmount);
    }
  }
  // Case 5: taxAmount + taxPercentage
  else if (taxAmount != null && taxPercentage != null && subtotalAmount == null) {
    if (taxPercentage !== 0) {
      subtotalAmount = toTwoDecimals(taxAmount / taxPercentage);
      amount = toTwoDecimals(subtotalAmount + taxAmount);
    }
  }
  // Case 6: amount + subtotal
  else if (amount != null && subtotalAmount != null && taxAmount == null) {
    taxAmount = toTwoDecimals(amount - subtotalAmount);
    if (subtotalAmount !== 0) {
      taxPercentage = toTwoDecimals(taxAmount / subtotalAmount);
    }
    // case 7 amount + subtotal + taxAmount
  } else if (amount != null && subtotalAmount != null && taxAmount != null) {
    taxPercentage = toTwoDecimals(taxAmount / subtotalAmount);
  }

  return {
    amount: amount != null ? toTwoDecimals(amount) : null,
    subtotalAmount: subtotalAmount != null ? toTwoDecimals(subtotalAmount) : null,
    taxAmount: taxAmount != null ? toTwoDecimals(taxAmount) : null,
    taxPercentage: taxPercentage != null ? Math.round(taxPercentage * 100) : null
  };
}