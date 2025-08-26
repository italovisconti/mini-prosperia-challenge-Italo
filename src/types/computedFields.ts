export type ComputedFields = {
  amount: number | null;
  subtotalAmount: number | null;
  taxAmount: number | null;
  taxPercentage: number | null; // puede ser 7 o 0.07; la función normaliza a decimal
};