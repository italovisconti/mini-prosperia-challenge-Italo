import { ParsedReceipt } from "../../types/receipt.js";
export interface AiProvider {
  structure(rawText: string): Promise<Partial<ParsedReceipt>>;
  categorize(input: { rawText: string; vendorName?: string; items?: ParsedReceipt["items"] }): Promise<Partial<ParsedReceipt>>;
}
