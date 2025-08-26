import { OcrProvider } from "./ocr.interface.js";
import Tesseract from "tesseract.js";
import { logger } from "../../config/logger.js";
const { createWorker } = Tesseract;

// const worker = await createWorker(
//   ['eng', 'spa'],
//   1,
//   {
//     langPath: './',
//     gzip: false,
//     logger: m => console.log(m),
//     errorHandler: err => console.error(err)
//   }
// );

export class TesseractOcr implements OcrProvider {

  private worker: Tesseract.Worker | null = null;
  private readonly langs = ['eng', 'spa'];
  private readonly appRoot = process.env.PWD;

  private async initWorker() {

    this.worker = await createWorker(
      this.langs,
      1,
      {
        langPath: this.appRoot + '/tess-trained-data',
        gzip: false,
        // logger: m => logger.info(m),
        errorHandler: err => logger.error(err)
      },
    );
    this.worker.setParameters({
      tessedit_char_whitelist: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZáéíóúÁÉÍÓÚñÑüÜ%:.,-',
      // preserve_interword_spaces: '1',
    });
  }

  async terminateWorker() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }  

  // TODO: Implementar extracción de información con Tesseract
  async extractText({ filePath }: { filePath: string; mimeType: string }) {

    console.log("Extracting text from file:", filePath);

    await this.initWorker();
    if (this.worker) {
      const { data: { text, confidence } } = await this.worker.recognize(filePath);
      logger.info({ message: "File recognized successfully", text, confidence });
      this.terminateWorker();

      // Se podria retornar "lines" del resultado en vez del texto.
      return { text, confidence };
    } 

    logger.error("Tesseract worker is not initialized.");
    return { text: "", confidence: 0 };
  }
}
