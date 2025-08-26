// filepath: src/services/vendors.service.ts
import { prisma } from "../db/client.js";
import { Vendor } from "@prisma/client";
import { logger } from "../config/logger.js";

export async function getOrCreateVendorByIdentifications(payload: {
  vendorName?: string | null;
  vendorIdentifications?: Array<{ type: string; value: string }>;
}): Promise<Vendor | null> {

  const vendorName = (payload.vendorName ?? "").trim();
  const ids = (payload.vendorIdentifications ?? [])
    .filter((i) => i && typeof i.type === "string" && typeof i.value === "string")
    .map((i) => ({ type: i.type.trim(), value: i.value.trim() }))
    .filter((i) => i.type && i.value);

  if (!vendorName && ids.length === 0) {
    logger.info({ message: "No vendor information provided." });
    return null;
  }

  // atomic
  return prisma.$transaction(async (tx) => {

    // Try to find by any identification (type and value)
    let existing = null as null | Vendor;

    if (ids.length > 0) {
      const match = await tx.vendorIdentification.findFirst({
        where: {
          OR: ids.map((i) => ({ type: i.type, value: i.value }))
        },
        include: { vendor: true }
      });
      if (match?.vendor) {
        logger.info({ message: "Found existing vendor by identification:", vendor: match.vendor });
        existing = match.vendor;
      }
    }

    // Fallback: try by name (case-insensitive) if no IDs or not found
    if (!existing && vendorName) {
      const byName = await tx.vendor.findFirst({
        where: { name: { equals: vendorName, mode: "insensitive" } }
      });
      if (byName) {
        logger.info({ message: "Found existing vendor by name:", vendor: byName });
        existing = byName;
      }
    }

    // Create vendor if still not found
    // ! only if we have at least one identification
    if (!existing) {
      if (ids.length === 0) {
        logger.info({ message: "No vendor identifications provided." });
        return null;
      }
      const created = await tx.vendor.create({
        data: {
          name: vendorName || "Unknown Vendor",
          identifications: ids.length
            ? {
                create: ids.map((i) => ({ type: i.type, value: i.value }))
              }
            : undefined
        }
      });
      logger.info({ message: "Created new vendor", vendor: created });
      return created;
    }

    // Ensure all captured identifications exist
    for (const i of ids) {
      const upsert = await tx.vendorIdentification.upsert({
        where: { vendorId_type: { vendorId: existing.id, type: i.type } },
        update: { value: i.value }, // if type exists, updated to latest value
        create: { vendorId: existing.id, type: i.type, value: i.value }
      });
      logger.info({ message: "Upserted vendor identification:", upsert });
    }

    // Update vendor name if we now have a better one
    if (vendorName && (vendorName.toLowerCase() !== existing.name.toLowerCase())) {
      existing = await tx.vendor.update({
        where: { id: existing.id },
        data: { name: vendorName }
      });
      logger.info({ message: "Updated vendor name:", vendor: existing });
    }

    return existing;
  });
}