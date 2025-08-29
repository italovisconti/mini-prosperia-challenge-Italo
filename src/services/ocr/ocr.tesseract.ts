import { OcrProvider } from "./ocr.interface.js";
import Tesseract from "tesseract.js";
import { logger } from "../../config/logger.js";
import { logMethod } from "../../utils/logging/method.decorator.logger.js";
const { createWorker } = Tesseract;

export class TesseractOcr implements OcrProvider {

  private worker: Tesseract.Worker | null = null;
  private readonly langs = ['osd', 'spa', 'eng'];
  private readonly appRoot = process.env.PWD;

  private async getWorker() {
    if (this.worker === null) {
      this.worker = await createWorker(
        this.langs,
        Tesseract.OEM.LSTM_ONLY,
        {
          // langPath: this.appRoot + '/tess-trained-data/',
          // gzip: false,
          // logger: m => logger.info(m),
          errorHandler: err => logger.error(err)
        },
      );
      await this.worker.setParameters({
        tessedit_char_whitelist: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZáéíóúÁÉÍÓÚñÑüÜ%:.,-$',
        // user_defined_dpi: "300",
        // tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
      });
    }
    return this.worker;
  }

  async terminateWorker() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }  

  // TODO: Implementar extracción de información con Tesseract
  @logMethod({ scope: "OCR:Tesseract" })
  async extractText({ filePath }: { filePath: string; mimeType: string }) {

    const worker = await this.getWorker();
    const { data: { text, confidence } } = await worker.recognize(filePath, {rotateAuto: true});

    // Se podria retornar "lines" del resultado en vez del texto.
    return { text, confidence };
    
  }
}
