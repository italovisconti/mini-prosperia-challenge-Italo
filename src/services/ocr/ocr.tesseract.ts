import { OcrProvider } from "./ocr.interface.js";
import Tesseract from "tesseract.js";
import { logger } from "../../config/logger.js";
import { writeFileSync } from "fs";
const { createWorker } = Tesseract;

export class TesseractOcr implements OcrProvider {

  private worker: Tesseract.Worker | null = null;
  private readonly langs = ['spa', 'eng'];
  private readonly appRoot = process.env.PWD;

  private async initWorker() {

    this.worker = await createWorker(
      this.langs,
      1,
      {
        // langPath: this.appRoot + '/tess-trained-data',
        langPath: this.appRoot + '/tess-trained-data/best',
        gzip: false,
        // logger: m => logger.info(m),
        errorHandler: err => logger.error(err)
      },
    );
    this.worker.setParameters({
      tessedit_char_whitelist: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZáéíóúÁÉÍÓÚñÑüÜ%:.,-$',
      // user_defined_dpi: "300",
      // tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
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
      const { data: { text, confidence } } = await this.worker.recognize(filePath, {rotateAuto: true});

      // testeando con pdf
      // const { data: { text, confidence, pdf, imageBinary } } = await this.worker.recognize(filePath, { rotateAuto: true }, { pdf: true, imageBinary: true });
      // Save the PDF Uint8Array to a file
      // const pdfFilePath = filePath.replace(/\.[^/.]+$/, "") + "_ocr.pdf";
      // writeFileSync(pdfFilePath, Buffer.from(pdf));
      // console.log("OCR PDF saved to:", pdfFilePath);

      // // Convert base64 imageBinary to binary and save to file
      // if (imageBinary) {
      //   const imageBuffer = Buffer.from(imageBinary, 'base64');
      //   const imageFilePath = filePath.replace(/\.[^/.]+$/, "") + "_ocr.png";
      //   writeFileSync(imageFilePath, imageBuffer);
      //   console.log("OCR IMAGE BINARY saved to:", imageFilePath);
      // }

      // return { pdfFilePath };

      logger.info({ message: "File recognized successfully", text, confidence });
      // this.terminateWorker();

      // Se podria retornar "lines" del resultado en vez del texto.
      return { text, confidence };
    } 

    logger.error("Tesseract worker is not initialized.");
    return { text: "", confidence: 0 };
  }
}
