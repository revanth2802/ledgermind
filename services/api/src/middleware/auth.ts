import { Request, Response, NextFunction } from 'express';

/**
 * Simple API key authentication
 * In production, use proper OAuth2/JWT
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const apiKey = authHeader.substring(7);
  
  // TODO: Validate against database or secure store
  // For MVP, just check it exists
  if (!apiKey) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  // Extract tenant ID from API key or separate header
  const tenantId = req.headers['x-tenant-id'] as string;
  
  if (!tenantId) {
    return res.status(400).json({ error: 'Missing X-Tenant-ID header' });
  }

  // Attach to request
  (req as any).tenantId = tenantId;
  (req as any).apiKey = apiKey;
  
  next();
}
