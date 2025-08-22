export interface OcrProvider {
  extractText(input: { filePath: string; mimeType: string }): Promise<{ text: string; confidence?: number }>;
}
