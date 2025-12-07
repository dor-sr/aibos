type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

/**
 * Simple logger with structured output
 * In production, this could be replaced with a more robust solution
 */
class Logger {
  private context: string;
  private minLevel: LogLevel;

  private readonly levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(context: string = 'app') {
    this.context = context;
    this.minLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.minLevel];
  }

  private formatMessage(level: LogLevel, message: string, ctx?: LogContext): string {
    const timestamp = new Date().toISOString();
    const base = {
      timestamp,
      level,
      context: this.context,
      message,
      ...ctx,
    };
    return JSON.stringify(base);
  }

  debug(message: string, ctx?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, ctx));
    }
  }

  info(message: string, ctx?: LogContext): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, ctx));
    }
  }

  warn(message: string, ctx?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, ctx));
    }
  }

  error(message: string, error?: Error, ctx?: LogContext): void {
    if (this.shouldLog('error')) {
      const errorContext = error
        ? {
            errorMessage: error.message,
            errorStack: error.stack,
            ...ctx,
          }
        : ctx;
      console.error(this.formatMessage('error', message, errorContext));
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(childContext: string): Logger {
    return new Logger(`${this.context}:${childContext}`);
  }
}

/**
 * Create a logger instance
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}

/**
 * Default application logger
 */
export const logger = createLogger('aibos');

export type { Logger, LogContext, LogLevel };







