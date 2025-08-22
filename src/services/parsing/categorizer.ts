import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function categorize(rawText: string): Promise<number | null> {
  const pairs: [string, string][] = [
    ["uber", "Transporte"],
    ["rapi", "Transporte"],
    ["gasolin", "Combustible"],
    ["farmacia", "Alimentación"],
    ["restaurante", "Alimentación"],
    ["servicio", "Servicios Públicos"],
    ["luz", "Servicios Públicos"],
    ["energia", "Servicios Públicos"],
    ["limpieza", "Aseo/Limpieza"],
    ["aseo", "Aseo/Limpieza"],
    ["suscrip", "Software/Suscripciones"]
  ];
  const text = rawText.toLowerCase();
  for (const [kw, cat] of pairs) {
    if (text.includes(kw)) {
      const acc = await prisma.account.findFirst({ where: { name: cat } });
      if (acc) return acc.id;
    }
  }
  return null;
}
