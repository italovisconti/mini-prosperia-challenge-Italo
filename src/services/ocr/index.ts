import { OcrProvider } from "./ocr.interface.js";
import { MockOcr } from "./ocr.mock.js";
import { TesseractOcr } from "./ocr.tesseract.js";

export function getOcrProvider(): OcrProvider {
  const provider = (process.env.OCR_PROVIDER || "tesseract").toLowerCase();
  switch (provider) {
    case "tesseract":
      return new TesseractOcr();
    case "mock":
    default:
      return new MockOcr();
  }
}