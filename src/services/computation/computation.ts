import { ComputedFields } from "../../types/computedFields.js";
import { logMethod } from "../../utils/logging/method.decorator.logger.js";


class ComputationService {
  
  @logMethod({scope: "ComputationService"})
  computeMissingFields(fields: ComputedFields): ComputedFields {
    const toTwoDecimals = (v: number) => Math.round(v * 100) / 100;
    let { amount, subtotalAmount, taxAmount, taxPercentage } = fields;

    if (taxPercentage != null && taxPercentage > 1) {
      taxPercentage /= 100;
    }

    // Case 1: amount + taxPercentage
    if (amount != null && taxPercentage != null && subtotalAmount == null && taxAmount == null) {
      subtotalAmount = amount / (1 + taxPercentage);
      taxAmount = amount - subtotalAmount;
    }
    // Case 2: amount + taxAmount
    else if (amount != null && taxAmount != null && subtotalAmount == null) {
      subtotalAmount = amount - taxAmount;
      if (subtotalAmount !== 0) {
        taxPercentage = taxAmount / subtotalAmount;
      }
    }
    // Case 3: subtotal + taxPercentage
    else if (subtotalAmount != null && taxPercentage != null && taxAmount == null && amount == null) {
      taxAmount = subtotalAmount * taxPercentage;
      amount = subtotalAmount + taxAmount;
    }
    // Case 4: subtotal + taxAmount
    else if (subtotalAmount != null && taxAmount != null && amount == null) {
      amount = subtotalAmount + taxAmount;
      if (subtotalAmount !== 0) {
        taxPercentage = taxAmount / subtotalAmount;
      }
    }
    // Case 5: taxAmount + taxPercentage
    else if (taxAmount != null && taxPercentage != null && subtotalAmount == null) {
      if (taxPercentage !== 0) {
        subtotalAmount = taxAmount / taxPercentage;
        amount = subtotalAmount + taxAmount;
      }
    }
    // Case 6: amount + subtotal
    else if (amount != null && subtotalAmount != null && taxAmount == null) {
      taxAmount = amount - subtotalAmount;
      if (subtotalAmount !== 0) {
        taxPercentage = taxAmount / subtotalAmount;
      }
      // case 7 amount + subtotal + taxAmount
    } else if (amount != null && subtotalAmount != null && taxAmount != null) {
      if (subtotalAmount !== 0) {
        taxPercentage = taxAmount / subtotalAmount;
      }
    }

    return {
      amount: amount != null ? toTwoDecimals(amount) : null,
      subtotalAmount: subtotalAmount != null ? toTwoDecimals(subtotalAmount) : null,
      taxAmount: taxAmount != null ? toTwoDecimals(taxAmount) : null,
      // taxPercentage: taxPercentage != null ? Math.round(taxPercentage * 100) : null
      taxPercentage: taxPercentage != null ? toTwoDecimals(taxPercentage * 100) : null
    };
  }

}

export const computationService = new ComputationService();
