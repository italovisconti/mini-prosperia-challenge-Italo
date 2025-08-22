import pino from "pino";
import pretty from "pino-pretty";

const isDev = process.env.NODE_ENV !== "production";
export const logger = isDev
	? pino(pretty({ colorize: true, translateTime: "SYS:standard", ignore: "pid,hostname" }))
	: pino({ level: process.env.LOG_LEVEL || "info" });
