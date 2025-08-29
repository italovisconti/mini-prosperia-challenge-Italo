import express from "express";
import path from "path";
import receiptsRouter from "./routes/receipts.routes.js";
import transactionsRouter from "./routes/transactions.routes.js";
import { logger } from "./config/logger.js";
import fs from "fs";
import process from "process";

// Log dir
const logDir = path.resolve(process.cwd(), "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const app = express();
app.use(express.json());

// Static UI (bonus): simple form to upload
app.use(express.static(path.resolve("public")));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/receipts", receiptsRouter);
app.use("/api/transactions", transactionsRouter);

app.use((err: any, _req: any, res: any, _next: any) => {
  logger.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal Error" });
});

export default app;
