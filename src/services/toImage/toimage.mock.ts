import { toImageProvider } from "./toimage.js";
import { logMethod } from "../../utils/logging/method.decorator.logger.js";

export class MockToImage implements toImageProvider {
  
  @logMethod({ scope: "ToImage:PDF2Pic" })
  async convert(input: { filePath: string; mimeType: string }): Promise<{ imagePath: string, mimeType: string }> {
    return {
      imagePath: input.filePath,
      mimeType: "image/png"
    };
  }
}
