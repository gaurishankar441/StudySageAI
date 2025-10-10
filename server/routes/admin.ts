import { Router } from 'express';
import { db } from '../db';
import { 
  adminConfigs, 
  configAuditLog, 
  unityBuilds,
  type InsertAdminConfig,
  type InsertConfigAuditLog,
  type InsertUnityBuild,
  type AuthUser
} from '@shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import { isAdmin, isSuperAdmin, hasPermission, ADMIN_PERMISSIONS, logAdminAction } from '../middleware/adminAuth';

const router = Router();

// Apply admin middleware to all routes
router.use(isAdmin);

// ========== CONFIGURATION MANAGEMENT ==========

// List all configs (optional filter by category)
router.get('/configs', async (req, res) => {
  try {
    const { category } = req.query;
    
    let configs;
    if (category) {
      configs = await db
        .select()
        .from(adminConfigs)
        .where(eq(adminConfigs.category, category as string))
        .orderBy(desc(adminConfigs.updatedAt));
    } else {
      configs = await db
        .select()
        .from(adminConfigs)
        .orderBy(adminConfigs.category, desc(adminConfigs.updatedAt));
    }
    
    res.json(configs);
  } catch (error) {
    console.error('[ADMIN] Error fetching configs:', error);
    res.status(500).json({ error: 'Failed to fetch configurations' });
  }
});

// Get specific config by ID
router.get('/configs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const config = await db
      .select()
      .from(adminConfigs)
      .where(eq(adminConfigs.id, id))
      .limit(1);
    
    if (!config.length) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    
    res.json(config[0]);
  } catch (error) {
    console.error('[ADMIN] Error fetching config:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

// Get config by category and key
router.get('/configs/:category/:key', async (req, res) => {
  try {
    const { category, key } = req.params;
    
    // Special handling for tutor personas - return from tutorPersonas.ts if not in DB
    if (category === 'tutor' && key === 'personas') {
      const config = await db
        .select()
        .from(adminConfigs)
        .where(and(
          eq(adminConfigs.category, category),
          eq(adminConfigs.key, key)
        ))
        .limit(1);
      
      if (config.length > 0) {
        return res.json(config[0].value);
      }
      
      // Fallback to hardcoded personas from config
      const { TUTOR_PERSONAS } = await import('../config/tutorPersonas');
      return res.json(Object.values(TUTOR_PERSONAS));
    }
    
    const config = await db
      .select()
      .from(adminConfigs)
      .where(and(
        eq(adminConfigs.category, category),
        eq(adminConfigs.key, key)
      ))
      .limit(1);
    
    if (!config.length) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    
    res.json(config[0]);
  } catch (error) {
    console.error('[ADMIN] Error fetching config:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

// Create new config
router.post('/configs', async (req, res) => {
  try {
    const { category, key, value, description, dataType } = req.body;
    const userId = (req.user as AuthUser).id;
    
    // Check if config already exists
    const existing = await db
      .select()
      .from(adminConfigs)
      .where(eq(adminConfigs.key, key))
      .limit(1);
    
    if (existing.length) {
      return res.status(400).json({ error: 'Configuration with this key already exists' });
    }
    
    const [newConfig] = await db
      .insert(adminConfigs)
      .values({
        category,
        key,
        value,
        description,
        dataType,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();
    
    // Log action
    await logAdminAction(userId, 'create', category, key, null, value, req);
    
    res.status(201).json(newConfig);
  } catch (error) {
    console.error('[ADMIN] Error creating config:', error);
    res.status(500).json({ error: 'Failed to create configuration' });
  }
});

// Update config
router.put('/configs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { value, description, dataType, isActive } = req.body;
    const userId = (req.user as AuthUser).id;
    
    // Get old value for audit
    const [oldConfig] = await db
      .select()
      .from(adminConfigs)
      .where(eq(adminConfigs.id, id))
      .limit(1);
    
    if (!oldConfig) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    
    const [updatedConfig] = await db
      .update(adminConfigs)
      .set({
        value: value !== undefined ? value : oldConfig.value,
        description: description !== undefined ? description : oldConfig.description,
        dataType: dataType !== undefined ? dataType : oldConfig.dataType,
        isActive: isActive !== undefined ? isActive : oldConfig.isActive,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(adminConfigs.id, id))
      .returning();
    
    // Log action
    await logAdminAction(
      userId, 
      'update', 
      oldConfig.category, 
      oldConfig.key, 
      oldConfig.value, 
      value, 
      req
    );
    
    res.json(updatedConfig);
  } catch (error) {
    console.error('[ADMIN] Error updating config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// Delete config (soft delete by setting isActive = false)
router.delete('/configs/:id', isSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req.user as AuthUser).id;
    
    const [oldConfig] = await db
      .select()
      .from(adminConfigs)
      .where(eq(adminConfigs.id, id))
      .limit(1);
    
    if (!oldConfig) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    
    await db
      .update(adminConfigs)
      .set({ isActive: false, updatedBy: userId, updatedAt: new Date() })
      .where(eq(adminConfigs.id, id));
    
    // Log action
    await logAdminAction(
      userId, 
      'delete', 
      oldConfig.category, 
      oldConfig.key, 
      oldConfig.value, 
      null, 
      req
    );
    
    res.json({ message: 'Configuration deleted successfully' });
  } catch (error) {
    console.error('[ADMIN] Error deleting config:', error);
    res.status(500).json({ error: 'Failed to delete configuration' });
  }
});

// ========== AUDIT LOGS ==========

// Get audit logs (with optional filters)
router.get('/audit/logs', hasPermission(ADMIN_PERMISSIONS.VIEW_AUDIT), async (req, res) => {
  try {
    const { category, changedBy, limit = '100' } = req.query;
    
    let query = db.select().from(configAuditLog);
    
    const conditions = [];
    if (category) {
      conditions.push(eq(configAuditLog.category, category as string));
    }
    if (changedBy) {
      conditions.push(eq(configAuditLog.changedBy, changedBy as string));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const logs = await query
      .orderBy(desc(configAuditLog.createdAt))
      .limit(parseInt(limit as string));
    
    res.json(logs);
  } catch (error) {
    console.error('[ADMIN] Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Get audit logs for specific config
router.get('/audit/logs/:configId', hasPermission(ADMIN_PERMISSIONS.VIEW_AUDIT), async (req, res) => {
  try {
    const { configId } = req.params;
    
    const logs = await db
      .select()
      .from(configAuditLog)
      .where(eq(configAuditLog.configId, configId))
      .orderBy(desc(configAuditLog.createdAt));
    
    res.json(logs);
  } catch (error) {
    console.error('[ADMIN] Error fetching config audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch config audit logs' });
  }
});

// ========== UNITY BUILD MANAGEMENT ==========

// List all Unity builds
router.get('/unity/builds', hasPermission(ADMIN_PERMISSIONS.MANAGE_UNITY), async (req, res) => {
  try {
    const builds = await db
      .select()
      .from(unityBuilds)
      .orderBy(desc(unityBuilds.createdAt));
    
    res.json(builds);
  } catch (error) {
    console.error('[ADMIN] Error fetching Unity builds:', error);
    res.status(500).json({ error: 'Failed to fetch Unity builds' });
  }
});

// Get Unity build by ID
router.get('/unity/builds/:id', hasPermission(ADMIN_PERMISSIONS.MANAGE_UNITY), async (req, res) => {
  try {
    const { id } = req.params;
    
    const [build] = await db
      .select()
      .from(unityBuilds)
      .where(eq(unityBuilds.id, id))
      .limit(1);
    
    if (!build) {
      return res.status(404).json({ error: 'Unity build not found' });
    }
    
    res.json(build);
  } catch (error) {
    console.error('[ADMIN] Error fetching Unity build:', error);
    res.status(500).json({ error: 'Failed to fetch Unity build' });
  }
});

// Activate Unity build (deactivate others)
router.post('/unity/builds/:id/activate', hasPermission(ADMIN_PERMISSIONS.MANAGE_UNITY), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req.user as AuthUser).id;
    
    // Deactivate all builds first
    await db
      .update(unityBuilds)
      .set({ isActive: false });
    
    // Activate selected build
    const [activatedBuild] = await db
      .update(unityBuilds)
      .set({ isActive: true })
      .where(eq(unityBuilds.id, id))
      .returning();
    
    if (!activatedBuild) {
      return res.status(404).json({ error: 'Unity build not found' });
    }
    
    // Log action
    await logAdminAction(
      userId, 
      'update', 
      'unity', 
      'active_build', 
      null, 
      { buildId: id, version: activatedBuild.version }, 
      req
    );
    
    res.json(activatedBuild);
  } catch (error) {
    console.error('[ADMIN] Error activating Unity build:', error);
    res.status(500).json({ error: 'Failed to activate Unity build' });
  }
});

export default router;
