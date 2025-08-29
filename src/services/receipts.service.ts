import { prisma } from "../db/client.js";
import { getOcrProvider } from "./ocr/index.js";
import { getAiProvider } from "./ai/index.js";
import { naiveParse } from "./parsing/parser.js";
import { categorize } from "./parsing/categorizer.js";
import { logger } from "../config/logger.js";
import { getOrCreateVendorByIdentifications } from "./vendors.service.js";
import { ParsedReceipt } from "../types/receipt.js";
import { computationService } from "./computation/computation.js";
import { getToImageProvider } from "./toImage/index.js";
import { getPreprocessProvider } from "./preprocess/index.js";

export async function processReceipt(filePath: string, meta: { originalName: string; mimeType: string; size: number }) {
  const ocr = getOcrProvider();
  const ai = getAiProvider();
  const toImage = getToImageProvider();
  const preprocess = getPreprocessProvider();

  // Convertir a Imagen
  const { imagePath, mimeType: ocrMime } = await toImage.convert({ filePath, mimeType: meta.mimeType });
  // Preprocesar Imagen
  const { imagePath: processedImagePath, mimeType: processedMimeType } = await preprocess.preprocessToOCR({ filePath: imagePath, mimeType: ocrMime });

  const ocrOut = await ocr.extractText({ filePath: processedImagePath, mimeType: processedMimeType });

  // 1) Reglas rápidas (incluye vendor identifications naive)
  const base = naiveParse(ocrOut.text);

  // TODO: Implementar
  // 2) Implementar IA opcional (esto mejora la extracción de información con una IA)
  const aiStruct = await ai.structure(ocrOut.text);

  // TODO: Implementar
  // 3) Implementar Categoría heurística
  const category = await categorize(ocrOut.text);

  const aiCategory = await ai.categorize({ rawText: ocrOut.text, vendorName: aiStruct.vendorName ?? base.vendorName ?? undefined });

  const computedValues = computationService.computeMissingFields({
    amount: aiStruct.amount ?? base.amount ?? null,
    subtotalAmount: aiStruct.subtotalAmount ?? base.subtotalAmount ?? null,
    taxAmount: aiStruct.taxAmount ?? base.taxAmount ?? null,
    taxPercentage: aiStruct.taxPercentage ?? base.taxPercentage ?? null
  });

  // check if date is valid
  if (aiStruct.date && isNaN(Date.parse(aiStruct.date))) {
    logger.warn({ message: "Invalid date format detected", date: aiStruct.date });
    aiStruct.date = null;
  } else if (base.date && isNaN(Date.parse(base.date))) {
    logger.warn({ message: "Invalid date format detected", date: base.date });
    base.date = null;
  }

  // TODO: Modificar para poder guardar
  const json: ParsedReceipt  = {
    amount: computedValues.amount,
    subtotalAmount: computedValues.subtotalAmount,
    taxAmount: computedValues.taxAmount,
    taxPercentage: computedValues.taxPercentage,
    type: aiStruct.type ?? "expense", // This can be obtained from the AI Category
    currency: aiStruct.currency ?? "USD",
    date: aiStruct.date ?? base.date ?? null,
    paymentMethod: aiStruct.paymentMethod ?? null,
    description: aiStruct.description ?? null,
    invoiceNumber: aiStruct.invoiceNumber ?? base.invoiceNumber ?? null,
    category: aiCategory.category ?? category ?? null,
    vendorId: aiStruct.vendorId ?? null,
    vendorName: aiStruct.vendorName ?? base.vendorName ?? null,
    vendorIdentifications: aiStruct.vendorIdentifications ?? base.vendorIdentifications ?? [],
    items: aiStruct.items ?? [],
    rawText: ocrOut.text,
  };

  if (json.amount === null) {
    throw new Error(`Amount could not be extracted from the receipt.`);
  }

  const vendor = await getOrCreateVendorByIdentifications({
    vendorName: json.vendorName,
    vendorIdentifications: json.vendorIdentifications
  });

  json.vendorId = vendor?.id ?? null;

  const saved = await prisma.receipt.create({
    data: {
      originalName: meta.originalName,
      mimeType: processedMimeType,
      size: meta.size,
      storagePath: processedImagePath,
      rawText: ocrOut.text,
      json,
      ocrProvider: process.env.OCR_PROVIDER || "tesseract",
      aiProvider: process.env.AI_PROVIDER || "mock"
    }
  });

  logger.info({ message: "Saved receipt with ID:", receiptId: saved.id });

  const savedTransaction = await prisma.transaction.create({
    data: {
      receiptId: saved.id,
      type: json.type,
      amount: json.amount,
      subtotalAmount: json.subtotalAmount,
      taxAmount: json.taxAmount,
      taxPercentage: json.taxPercentage,
      currency: json.currency ?? "USD",
      date: json.date ? new Date(json.date) : new Date(),
      accountId: json.category,
      vendorId: vendor?.id ?? null,
    }
  });

  logger.info({ message: "Saved transaction with ID:", transactionId: savedTransaction.id });

  return saved;
}
