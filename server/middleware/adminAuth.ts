import { Request, Response, NextFunction } from 'express';
import type { AuthUser } from '@shared/schema';

// Admin permission constants
export const ADMIN_PERMISSIONS = {
  EDIT_PERSONAS: 'edit_personas',
  EDIT_PROMPTS: 'edit_prompts',
  MANAGE_UNITY: 'manage_unity_builds',
  MANAGE_API_KEYS: 'manage_api_keys',
  EDIT_CACHE: 'edit_cache_config',
  VIEW_AUDIT: 'view_audit_logs',
  SYSTEM_SETTINGS: 'edit_system_settings',
  SUPER_ADMIN: 'super_admin',
} as const;

// Check if user is admin or super admin
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.user as AuthUser | undefined;
  
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized - Please login' });
  }
  
  const userRole = user.role || 'user';
  
  if (userRole !== 'admin' && userRole !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden - Admin access required' });
  }
  
  next();
}

// Check if user has super admin role
export function isSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.user as AuthUser | undefined;
  
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized - Please login' });
  }
  
  const userRole = user.role || 'user';
  
  if (userRole !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden - Super admin access required' });
  }
  
  next();
}

// Check if user has specific permission
export function hasPermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as AuthUser | undefined;
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized - Please login' });
    }
    
    const userRole = user.role || 'user';
    const permissions = user.permissions || [];
    
    // Super admin has all permissions
    if (userRole === 'super_admin') {
      return next();
    }
    
    // Check if user has the required permission
    if (!permissions.includes(permission) && !permissions.includes(ADMIN_PERMISSIONS.SUPER_ADMIN)) {
      return res.status(403).json({ 
        error: `Forbidden - Permission '${permission}' required` 
      });
    }
    
    next();
  };
}

// Log admin action to audit trail
export async function logAdminAction(
  userId: string,
  action: string,
  category: string,
  key: string,
  oldValue: any,
  newValue: any,
  req: Request
) {
  const { db } = await import('../db');
  const { configAuditLog } = await import('@shared/schema');
  
  await db.insert(configAuditLog).values({
    action,
    category,
    key,
    oldValue,
    newValue,
    changedBy: userId,
    ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.get('user-agent') || 'unknown',
  });
}
