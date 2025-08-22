import dotenv from "dotenv";
dotenv.config();
import app from "./app.js";
import { logger } from "./config/logger.js";

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => logger.info(`API listening on :${port}`));
