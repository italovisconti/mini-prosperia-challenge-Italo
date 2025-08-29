import { logMethod } from "../../utils/logging/method.decorator.logger.js";
import { preprocessProvider } from "./preprocess.js";
import path from "path";
import fs from "fs";
// import { createCanvas, loadImage } from "canvas";
import { logger } from "../../config/logger.js";

// De: https://dev.to/mathewthe2/using-javascript-to-preprocess-images-for-ocr-1jc

/*
export class canvasPreprocess implements preprocessProvider {
  @logMethod({ scope: "Preprocess:Canvas" })
  async preprocessToOCR(input: { filePath: string; mimeType: string }): Promise<{ imagePath: string, mimeType: string }> {
    const { filePath, mimeType } = input;

    // Validate
    if (!fs.existsSync(filePath)) {
      throw new Error(`preprocessToOCR(canvas): file not found: ${filePath}`);
    }

    const dir = path.dirname(filePath);
    const base = path.basename(filePath, path.extname(filePath));
    const outPath = path.join(dir, `${base}-ocr-canvas.png`);
    const outMimeType = "image/png";

    // Skip PDFs
    if (mimeType === "application/pdf" || filePath.toLowerCase().endsWith(".pdf")) {
      logger.warn("preprocessToOCR(canvas): PDF received. Skipping canvas preprocessing.");
      return { imagePath: filePath, mimeType };
    }

    try {
      // Load and draw image
      const img = await loadImage(filePath);
      const width = img.width;
      const height = img.height;

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      // Ensure opaque white background to avoid transparency
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);
      const pixels = imageData.data; // Uint8ClampedArray RGBA

      // Pipeline from the article: blur -> dilate -> invert -> threshold
      blurSeparableGrayscale(pixels, width, height, 1);
      dilateGrayscale(pixels, width, height);
      invertColors(pixels);
      thresholdFilter(pixels, 0.4);

      ctx.putImageData(imageData, 0, 0);

      const buf = canvas.toBuffer("image/png");
      await fs.promises.writeFile(outPath, buf);

      logger.info({
        message: "preprocessToOCR(canvas): done",
        steps: ["blur(1)", "dilate", "invert", "threshold(0.4)", "to PNG"],
        outPath,
        size: { width, height }
      });

      return { imagePath: outPath, mimeType: outMimeType };
    } catch (err) {
      logger.error({ message: "preprocessToOCR(canvas): failed", error: (err as Error).message });
      // Fallback to original to avoid breaking downstream OCR
      return { imagePath: filePath, mimeType };
    }
  }
}

// Invert RGB, keep alpha
function invertColors(pixels: Uint8ClampedArray) {
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 255 - pixels[i];
    pixels[i + 1] = 255 - pixels[i + 1];
    pixels[i + 2] = 255 - pixels[i + 2];
    // leave alpha as-is
  }
}

// Threshold to pure black/white using luminance
function thresholdFilter(pixels: Uint8ClampedArray, level = 0.5) {
  const thresh = Math.floor(level * 255);
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const v = gray >= thresh ? 255 : 0;
    pixels[i] = pixels[i + 1] = pixels[i + 2] = v;
    pixels[i + 3] = 255; // make opaque
  }
}

// Simple separable blur on grayscale (radius 1) and write back to RGB
function blurSeparableGrayscale(pixels: Uint8ClampedArray, width: number, height: number, radius = 1) {
  const N = width * height;
  const gray = new Uint8ClampedArray(N);
  for (let i = 0, j = 0; i < pixels.length; i += 4, j++) {
    gray[j] = Math.round(0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2]);
  }
  const temp = new Float32Array(N);
  // horizontal pass
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const xm1 = x > 0 ? x - 1 : x;
      const xp1 = x < width - 1 ? x + 1 : x;
      temp[row + x] = (gray[row + xm1] + 2 * gray[row + x] + gray[row + xp1]) * 0.25;
    }
  }
  // vertical pass
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const ym1 = y > 0 ? y - 1 : y;
      const yp1 = y < height - 1 ? y + 1 : y;
      const val = (temp[ym1 * width + x] + 2 * temp[y * width + x] + temp[yp1 * width + x]) * 0.25;
      gray[y * width + x] = Math.max(0, Math.min(255, Math.round(val)));
    }
  }
  // write back to RGB
  for (let i = 0, j = 0; j < N; i += 4, j++) {
    const v = gray[j];
    pixels[i] = pixels[i + 1] = pixels[i + 2] = v;
  }
}

// Grayscale dilation with 4-neighborhood
function dilateGrayscale(pixels: Uint8ClampedArray, width: number, height: number) {
  const N = width * height;
  const src = new Uint8ClampedArray(N);
  for (let i = 0, j = 0; i < pixels.length; i += 4, j++) {
    src[j] = Math.round(0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2]);
  }
  const dst = new Uint8ClampedArray(N);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      let m = src[idx];
      if (x > 0) m = Math.max(m, src[idx - 1]);
      if (x < width - 1) m = Math.max(m, src[idx + 1]);
      if (y > 0) m = Math.max(m, src[idx - width]);
      if (y < height - 1) m = Math.max(m, src[idx + width]);
      dst[idx] = m;
    }
  }
  for (let i = 0, j = 0; j < N; i += 4, j++) {
    const v = dst[j];
    pixels[i] = pixels[i + 1] = pixels[i + 2] = v;
    pixels[i + 3] = 255;
  }
}

*/