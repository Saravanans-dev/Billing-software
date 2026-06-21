import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import pool from '../config/database';

const SENSITIVE_FIELDS = new Set(['password', 'current_password', 'new_password', 'password_hash']);

function sanitizeForAudit(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.has(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeForAudit(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export function auditLog(action: string, entityType?: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      if (req.user && res.statusCode < 400) {
        const entityId = req.params.id || body?.id || null;
        pool.query(
          `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            req.user.id,
            action,
            entityType || null,
            entityId,
            JSON.stringify({ body: sanitizeForAudit(req.body), params: req.params }),
            req.ip,
          ]
        ).catch((err) => console.error('Audit log error:', err));
      }
      return originalJson(body);
    };
    next();
  };
}
