import { Request, Response, NextFunction } from "express";
import { prisma } from "../db/client.js";
import { HttpError } from "../utils/errors.js";

export async function createTransaction(req: Request, res: Response, next: NextFunction) {
  try {
    const { amount, currency, date, type, accountId, vendorId, description } = req.body || {};
    if (!amount || !currency || !date || !type) throw new HttpError(400, "amount, currency, date, type are required");
    const tx = await prisma.transaction.create({
      data: {
        amount, currency, date: new Date(date), type,
        accountId, vendorId, description
      }
    });
    res.status(201).json(tx);
  } catch (e) { next(e); }
}
