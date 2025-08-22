import { OcrProvider } from "./ocr.interface.js";
import Tesseract from "tesseract.js";

export class TesseractOcr implements OcrProvider {
  // TODO: Implementar extracción de información con Tesseract
  async extractText({ filePath }: { filePath: string; mimeType: string }) {
    return { text: "", confidence: 0 };
  }
}
