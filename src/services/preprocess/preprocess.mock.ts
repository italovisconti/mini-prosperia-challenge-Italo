import { logMethod } from "../../utils/logging/method.decorator.logger.js";
import { preprocessProvider } from "./preprocess.js";

export class mockPreprocess implements preprocessProvider {
  @logMethod({ scope: "Preprocess:Mock" })
  async preprocessToOCR(input: { filePath: string; mimeType: string }): Promise<{ imagePath: string, mimeType: string }> {
    return {
      imagePath: input.filePath,
      mimeType: input.mimeType
    };
  }
}
