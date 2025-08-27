import { preprocessProvider } from "./preprocess.js";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { logger } from "../../config/logger.js";

export class sharpPreprocess implements preprocessProvider {
  async preprocessToOCR(input: { filePath: string; mimeType: string }): Promise<{ imagePath: string, mimeType: string }> {
    const { filePath, mimeType } = input;

    // Validate input file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`preprocessToOCR: file not found: ${filePath}`);
    }

    const dir = path.dirname(filePath);
    const base = path.basename(filePath, path.extname(filePath));
    const outPath = path.join(dir, `${base}-ocr-gray.png`);
    const outMimeType = "image/png";

    // it should never received a PDF
    if (mimeType === "application/pdf" || filePath.toLowerCase().endsWith(".pdf")) {
      logger.warn("preprocessToOCR: PDF received. Skipping Sharp preprocessing.");
      return { imagePath: filePath, mimeType };
    }

    try {
      // Load image and read metadata (to decide on optional resizing)
      const img = sharp(filePath, { failOn: "none" });
      const meta = await img.metadata();

      // 4) Determine a target width to approximate ~300 DPI for A4 width (~2480 px) without over-upscaling
      //    - If width is small (< 1600px), upscale up to 2x but cap around 2400px
      //    - If width is already large, keep original width
      const currentWidth = meta.width ?? 0;
      const targetMinWidth = 1800; // conservative default target width
      const targetCapWidth = 2600; // avoid extreme upscaling
      let resizeWidth: number | null = null;
      if (currentWidth > 0 && currentWidth < targetMinWidth) {
        const upscaled = Math.min(Math.floor(currentWidth * 1.6), targetCapWidth);
        if (upscaled > currentWidth) resizeWidth = upscaled;
      }

      // Build preprocessing pipeline
      //    Steps:
      //      - rotate(): auto-fix orientation using EXIF
      //      - grayscale(): reduce color noise
      //      - median(1): light denoise
      //      - optional resize to target width
      //      - modulate + gamma: gentle contrast/brightness shaping
      //      - sharpen(): slight sharpen to reinforce edges

      let pipeline = sharp(filePath, { failOn: "none" })
        .rotate()
        .grayscale()
        .median(1);

      // Resize deactivated
      // if (resizeWidth) {
      //   pipeline = pipeline.resize({ width: resizeWidth, kernel: sharp.kernel.lanczos3 });
      // }

      pipeline = pipeline
        .modulate({ brightness: 1.02, saturation: 1.0 })
        .linear(1.03, -5)
        .gamma(1.01)
        .sharpen({ sigma: 0.7 })
        .png({ compressionLevel: 0, adaptiveFiltering: true, force: true });

      await pipeline.toFile(outPath);

      logger.info({
        message: "preprocessToOCR: image preprocessed for OCR (grayscale)",
        filePath,
        outPath,
        steps: [
          "rotate(EXIF)",
          "grayscale",
          "median(1)",
          resizeWidth ? `resize(width=${resizeWidth})` : "resize(skipped)",
          "modulate(bright=1.02)",
          "linear(1.03, -5)",
          "gamma(1.01)",
          "sharpen(sigma=0.7)",
          "to PNG",
        ],
      });

      return { imagePath: outPath, mimeType: outMimeType };
    } catch (err) {
      logger.error({ message: "preprocessToOCR: preprocessing failed", error: (err as Error).message });
      return { imagePath: filePath, mimeType };
    }
  }
}
