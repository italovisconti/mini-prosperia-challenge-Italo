import { prisma } from "../db/client.js";
import { getOcrProvider } from "./ocr/index.js";
import { getAiProvider } from "./ai/index.js";
import { naiveParse } from "./parsing/parser.js";
import { categorize } from "./parsing/categorizer.js";

export async function processReceipt(filePath: string, meta: { originalName: string; mimeType: string; size: number }) {
  const ocr = getOcrProvider();
  const ai = getAiProvider();

  // TODO: Implementar ocr.extractText con Tesseract
  const ocrOut = await ocr.extractText({ filePath, mimeType: meta.mimeType });

  // 1) Reglas rápidas (incluye vendor identifications naive)
  const base = naiveParse(ocrOut.text);

  // TODO: Implementar
  // 2) Implementar IA opcional (esto mejora la extracción de información con una IA)
  const aiStruct = await ai.structure(ocrOut.text).catch(() => ({} as any));

  // TODO: Implementar
  // 3) Implementar Categoría heurística
  const category = await categorize(ocrOut.text);


  // TODO: Modificar para poder guardar
  const json = {
    amount: (aiStruct as any).amount ?? base.amount ?? null,
    subtotalAmount: (aiStruct as any).subtotalAmount ?? base.subtotalAmount ?? null,
    taxAmount: (aiStruct as any).taxAmount ?? base.taxAmount ?? null,
    taxPercentage: (aiStruct as any).taxPercentage ?? base.taxPercentage ?? null,
    type: (aiStruct as any).type ?? "expense",
    currency: (aiStruct as any).currency ?? "USD",
    date: (aiStruct as any).date ?? base.date ?? null,
    paymentMethod: (aiStruct as any).paymentMethod ?? null,
    description: (aiStruct as any).description ?? null,
    invoiceNumber: (aiStruct as any).invoiceNumber ?? base.invoiceNumber ?? null,
    category: category,
    vendorId: (aiStruct as any).vendorId ?? null,
    vendorName: (aiStruct as any).vendorName ?? base.vendorName ?? null,
    vendorIdentifications: (aiStruct as any).vendorIdentifications ?? base.vendorIdentifications ?? [],
    items: (aiStruct as any).items ?? [],
    rawText: ocrOut.text
  };

  const saved = await prisma.receipt.create({
    data: {
      originalName: meta.originalName,
      mimeType: meta.mimeType,
      size: meta.size,
      storagePath: filePath,
      rawText: ocrOut.text,
      json,
      ocrProvider: process.env.OCR_PROVIDER || "tesseract",
      aiProvider: process.env.AI_PROVIDER || "mock"
    }
  });

  return saved;
}
