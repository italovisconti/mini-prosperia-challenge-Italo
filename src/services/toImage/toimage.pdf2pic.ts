import { toImageProvider } from "./toimage.js";
import path from "path";
import fs from "fs";
import { fromPath } from "pdf2pic";
import { logMethod } from "../../utils/logging/method.decorator.logger.js";

export class PDF2PicProvider implements toImageProvider {
  
  @logMethod({ scope: "ToImage:PDF2Pic" })
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
      density: 300,
      format: "png",
      savePath: dir,
      saveFilename,
      quality: 100,
      width: 1920,
      preserveAspectRatio: true
    });

    // Convert only the first page
    const result = await converter(1, { responseType: "image" });

    const outPath = result.path ?? path.join(dir, `${saveFilename}_1.png`);
    const outMimeType = "image/png";

    if (!fs.existsSync(outPath)) {
      return { imagePath: filePath, mimeType };
    }

    return { imagePath: outPath, mimeType: outMimeType };
  }
}
