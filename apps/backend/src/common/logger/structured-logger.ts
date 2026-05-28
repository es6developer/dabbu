import { Injectable, LoggerService, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: string;
  trace?: string;
  userId?: string;
  requestId?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

@Injectable({ scope: Scope.TRANSIENT })
export class StructuredLogger implements LoggerService {
  private context?: string;
  private logDir: string;

  constructor(private configService: ConfigService) {
    this.logDir = path.join(process.cwd(), 'logs');
    if (this.configService.get('app.nodeEnv') === 'production') {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    }
  }

  setContext(context: string): void {
    this.context = context;
  }

  log(message: string, metadata?: Record<string, unknown>): void {
    this.write('info', message, metadata);
  }

  error(message: string, trace?: string, metadata?: Record<string, unknown>): void {
    this.write('error', message, { ...metadata, trace });
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.write('warn', message, metadata);
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    if (this.configService.get('app.nodeEnv') !== 'production') {
      this.write('debug', message, metadata);
    }
  }

  verbose(message: string, metadata?: Record<string, unknown>): void {
    if (this.configService.get('app.nodeEnv') !== 'production') {
      this.write('verbose', message, metadata);
    }
  }

  private write(level: string, message: string, metadata?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
      ...metadata,
    };

    const formatted = JSON.stringify(entry);

    // Console output for development
    if (this.configService.get('app.nodeEnv') !== 'production') {
      const color = level === 'error' ? '\x1b[31m' : level === 'warn' ? '\x1b[33m' : level === 'debug' ? '\x1b[36m' : '\x1b[32m';
      console.log(`${color}[${level.toUpperCase()}]\x1b[0m [${this.context || 'App'}] ${message}`);
      return;
    }

    // File output for production
    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logDir, `${date}.log`);

    try {
      fs.appendFileSync(logFile, formatted + '\n');
    } catch {
      console.error('Failed to write log file:', logFile);
    }

    // Error level also goes to stderr
    if (level === 'error') {
      console.error(formatted);
    }
  }
}
