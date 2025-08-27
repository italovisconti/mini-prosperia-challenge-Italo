export interface preprocessProvider {
  preprocessToOCR(input: { filePath: string; mimeType: string }): Promise<{ imagePath: string, mimeType: string }>;
}
