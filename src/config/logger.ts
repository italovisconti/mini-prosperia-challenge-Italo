import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = isDev
  ? pino({
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname'
        }
      }
    })
	// log rotation
  : pino({
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        targets: [
          {
            target: 'pino-roll',
            options: {
              file: 'logs/app.log',
              size: '20m',
              maxFiles: 5
            }
          }
        ]
      }
    });

