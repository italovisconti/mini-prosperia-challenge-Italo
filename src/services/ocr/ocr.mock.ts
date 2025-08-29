import { logMethod } from "../../utils/logging/method.decorator.logger.js";
import { OcrProvider } from "./ocr.interface.js";
export class MockOcr implements OcrProvider {
  @logMethod({ scope: "OCR:Mock" })
  async extractText(): Promise<{ text: string; confidence?: number }> {
    return { text: "TOTAL: 12.34\nIVA 7%: 0.81\nFactura: ABC-123\nFecha: 2024-06-01\nUber BV RUC 12345678-9", confidence: 0.9 };
  }
}
