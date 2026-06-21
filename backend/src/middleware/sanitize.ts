import { Request, Response, NextFunction } from 'express';

function encodeHTML(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') return encodeHTML(value);
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
      if (typeof val === 'string') req.query[key] = encodeHTML(val);
    }
  }
  if (req.params) {
    for (const key of Object.keys(req.params)) {
      req.params[key] = encodeHTML(req.params[key]);
    }
  }
  next();
}
