import winston from 'winston';
import path from 'path';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

const createLogger = (): winston.Logger => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Console format for development
  const consoleFormat = combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    simple()
  );

  // File format for production
  const fileFormat = combine(
    timestamp(),
    errors({ stack: true }),
    json()
  );

  const logger = winston.createLogger({
    level: isDevelopment ? 'debug' : 'info',
    format: fileFormat,
    defaultMeta: { service: 'manahr-backend' },
    transports: [
      // Console transport
      new winston.transports.Console({
        format: isDevelopment ? consoleFormat : fileFormat,
      }),
    ],
  });

  // Add file transports for production
  if (!isDevelopment) {
    logger.add(
      new winston.transports.File({
        filename: path.join(process.cwd(), 'logs', 'error.log'),
        level: 'error',
      })
    );

    logger.add(
      new winston.transports.File({
        filename: path.join(process.cwd(), 'logs', 'combined.log'),
      })
    );
  }

  return logger;
};

export const logger = createLogger();