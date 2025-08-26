export interface toImageProvider {
  convert(input: { filePath: string; mimeType: string }): Promise<{ imagePath: string, mimeType: string }>;
}
