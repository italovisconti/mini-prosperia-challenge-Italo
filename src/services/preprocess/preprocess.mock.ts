import { preprocessProvider } from "./preprocess.js";

export class mockPreprocess implements preprocessProvider {
  async preprocessToOCR(input: { filePath: string; mimeType: string }): Promise<{ imagePath: string, mimeType: string }> {
    return {
      imagePath: input.filePath,
      mimeType: input.mimeType
    };
  }
}
