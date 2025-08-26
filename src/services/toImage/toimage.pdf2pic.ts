import { toImageProvider } from "./toimage.js";
import path from "path";
import fs from "fs";
import { fromPath } from "pdf2pic";
import { logger } from "../../config/logger.js";

export class PDF2PicProvider implements toImageProvider {
  async convert(input: { filePath: string; mimeType: string }): Promise<{ imagePath: string, mimeType: string }> {
    const { filePath, mimeType } = input;

    if (mimeType.startsWith("image/")) {
      return { imagePath: filePath, mimeType };
    }

    if (!mimeType.includes("pdf")) {
      return { imagePath: filePath, mimeType };
    }

    // Prepare output directory and filename
    const dir = path.dirname(filePath);
    const base = path.basename(filePath, path.extname(filePath));
    const saveFilename = `${base}-page`;

    const converter = fromPath(filePath, {
      density: 600,
      format: "png",
      savePath: dir,
      saveFilename,
      quality: 100,
      width: 1920,
      height: 1080,
      preserveAspectRatio: true
    });

    // Convert only the first page
    const result = await converter(1, { responseType: "image" });

    const outPath = result.path ?? path.join(dir, `${saveFilename}_1.png`);
    const outMimeType = "image/png";

    // Ensure file exists before returning
    if (!fs.existsSync(outPath)) {
      // Fallback to original path if something went wrong
      return { imagePath: filePath, mimeType };
    }

    logger.info({ message: "PDF converted to image", filePath, outPath, outMimeType });

    return { imagePath: outPath, mimeType: outMimeType };
  }
}
