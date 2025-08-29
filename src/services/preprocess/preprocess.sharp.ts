import { preprocessProvider } from './preprocess.js';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { logger } from '../../config/logger.js';
import { logMethod } from '../../utils/logging/method.decorator.logger.js';

export class sharpPreprocess implements preprocessProvider {
  @logMethod({ scope: 'Preprocess:Sharp' })
  async preprocessToOCR(input: {
    filePath: string;
    mimeType: string;
  }): Promise<{ imagePath: string; mimeType: string }> {
    const { filePath, mimeType } = input;

    // Validate
    if (!fs.existsSync(filePath)) {
      throw new Error(`preprocessToOCR: file not found: ${filePath}`);
    }

    const dir = path.dirname(filePath);
    const base = path.basename(filePath, path.extname(filePath));
    const outPath = path.join(dir, `${base}-ocr-binary.png`);
    const outMimeType = 'image/png';

    // it should never received a PDF
    if (
      mimeType === 'application/pdf' ||
      filePath.toLowerCase().endsWith('.pdf')
    ) {
      logger.warn(
        'preprocessToOCR: PDF received. Skipping Sharp preprocessing.'
      );
      return { imagePath: filePath, mimeType };
    }

    try {
      const img = sharp(filePath, { failOn: 'none' });
      const meta = await img.metadata();
      const histogram = new Array(256).fill(0) as number[];
      let mean = 0;


      // Build a preview for stats 
      const targetWidth = Math.min(1600, meta.width ?? 1600);
      const preview = sharp(filePath, { failOn: 'none' })
        .rotate()
        .grayscale()
        .resize({ width: targetWidth, withoutEnlargement: true })
        .raw();

      const { data: previewData, info: previewInfo } = await preview.toBuffer({resolveWithObject: true});
      
      for (let i = 0; i < previewData.length; i++) {
        histogram[previewData[i]]++;
      }
      const totalPixels = previewInfo.width * previewInfo.height;
      for (let i = 0; i < 256; i++) mean += i * (histogram[i] / totalPixels);
      const shouldInvert = mean < 110;
      const otsu = totalPixels > 0 ? computeOtsuThreshold(histogram, totalPixels) : undefined;

      const thresholdValue = otsu ?? 160; // fallback 

      let pipe = sharp(filePath, { failOn: 'none' }).rotate();
      if (shouldInvert) pipe = pipe.negate({ alpha: false });
      await pipe
        .grayscale()
        .median(1)
        .threshold(thresholdValue)
        .png({ compressionLevel: 0, force: true })
        .toFile(outPath);

      logger.info({
        stepsMadeOnImage: [
          shouldInvert ? 'invert' : 'no-invert',
          'grayscale',
          'median(1)',
          `threshold(otsu=${otsu ?? 'fallback'}, value=${thresholdValue})`,
        ],
        meta: {
          width: meta.width,
          height: meta.height,
          channels: meta.channels,
          space: meta.space,
          meanGray: Math.round(mean)
        }
      });

      return { imagePath: outPath, mimeType: outMimeType };
    } catch (err) {
      logger.error({
        message: 'preprocessToOCR: preprocessing failed',
        error: (err as Error).message
      });

      return { imagePath: filePath, mimeType };
    }
  }
}

// Otsu's method for global thresholding on 8-bit grayscale histogram
function computeOtsuThreshold(hist: number[], total: number): number {
  const prob = new Array(256).fill(0);
  for (let i = 0; i < 256; i++) prob[i] = hist[i] / total;

  let sumTotal = 0;
  for (let i = 0; i < 256; i++) sumTotal += i * prob[i];

  let wB = 0; // weight background
  let sumB = 0; // sum background
  let maxBetween = -1;
  let threshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += prob[t];
    if (wB === 0) continue;
    const wF = 1 - wB;
    if (wF === 0) break;
    sumB += t * prob[t];
    const mB = sumB / wB;
    const mF = (sumTotal - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > maxBetween) {
      maxBetween = between;
      threshold = t;
    }
  }
  return threshold;
}
