import { Request, Response, NextFunction } from 'express';

function stripXSS(value: string): string {
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/<[^>]*>/g, '');
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') return stripXSS(value);
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      sanitized[k] = sanitizeValue(v);
    }
    return sanitized;
  }
  return value;
}

export function sanitizeInput(req: Request, _res: Response, next: NextFunction) {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.query) {
    for (const key of Object.keys(req.query)) {
      const val = req.query[key];
      if (typeof val === 'string') req.query[key] = stripXSS(val);
    }
  }
  if (req.params) {
    for (const key of Object.keys(req.params)) {
      req.params[key] = stripXSS(req.params[key]);
    }
  }
  next();
}
