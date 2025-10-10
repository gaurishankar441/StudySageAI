# VaktaAI Admin Panel - Complete Architecture

## Overview
Comprehensive admin panel for managing all platform configurations including AI tutor settings, Unity avatar builds, TTS/STT providers, caching, and system parameters.

---

## 📊 Database Schema (shared/schema.ts additions)

```typescript
// Admin Configuration Tables

export const adminConfigs = pgTable("admin_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: varchar("category").notNull(), // 'tutor', 'unity', 'tts', 'api', 'system', 'cache'
  key: varchar("key").notNull().unique(), // e.g., 'tutor_personas', 'unity_gameobject_name'
  value: jsonb("value").notNull(), // JSON configuration data
  description: text("description"),
  dataType: varchar("data_type"), // 'json', 'string', 'number', 'boolean', 'array'
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const configAuditLog = pgTable("config_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  configId: varchar("config_id").references(() => adminConfigs.id, { onDelete: "cascade" }),
  action: varchar("action").notNull(), // 'create', 'update', 'delete', 'restore'
  category: varchar("category").notNull(),
  key: varchar("key").notNull(),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  changedBy: varchar("changed_by").references(() => users.id).notNull(),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const unityBuilds = pgTable("unity_builds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  version: varchar("version").notNull(), // '1.0.0', '1.1.0'
  buildDate: timestamp("build_date").notNull(),
  gameObjectName: varchar("game_object_name").notNull(), // 'AvatarController'
  s3Prefix: varchar("s3_prefix").default('unity-assets/'),
  files: jsonb("files").$type<{
    dataGz: { key: string; size: number; uploadedAt: string };
    wasmGz: { key: string; size: number; uploadedAt: string };
    frameworkJsGz: { key: string; size: number; uploadedAt: string };
    loaderJs: { key: string; size: number; uploadedAt: string };
  }>(),
  isActive: boolean("is_active").default(false),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

---

## 🗂️ Configuration Categories & Keys

### 1. **AI Tutor Configuration**

#### Tutor Personas (`tutor_personas`)
```json
{
  "priya": {
    "id": "priya",
    "name": "Priya",
    "gender": "female",
    "subjects": ["Physics", "Mathematics"],
    "personality": {
      "traits": ["energetic", "encouraging"],
      "toneOfVoice": "warm and enthusiastic",
      "catchphrases": ["Waah! Bilkul sahi!", "Shabash!"],
      "errorHandling": "gentle and supportive",
      "celebrationStyle": "enthusiastic with emojis"
    },
    "voiceSettings": {
      "sarvam": {
        "speaker": "anushka",
        "pitch": "1.05",
        "pace": "1.05",
        "loudness": "1.0"
      },
      "polly": {
        "voiceId": "Kajal",
        "engine": "neural",
        "speakingRate": "1.05",
        "pitch": "+5%"
      }
    },
    "languageStyle": {
      "hindiPercentage": 60,
      "englishPercentage": 40,
      "codeSwitch": "natural and frequent",
      "technicalTerms": "English with Hindi explanation"
    }
  }
}
```

#### System Prompts (`system_prompts`)
```json
{
  "hindi_hinglish": {
    "core": "You are VaktaAI...",
    "intent_overrides": {
      "request_explanation": "When explaining: Start with...",
      "request_hint": "When student wants hint: CRITICAL...",
      "submit_answer": "When evaluating answer: If correct..."
    }
  },
  "english_pure": {
    "core": "You are VaktaAI...",
    "intent_overrides": {...}
  }
}
```

#### First Messages (`first_messages`)
```json
{
  "greeting": {
    "hi": {
      "morning": "Namaste {name}! Subah subah padhai ka mood hai? {emoji}",
      "afternoon": "Hello {name}! Aaj kya seekhenge? {emoji}",
      "evening": "Hi {name}! Shaam ko thoda padh lete hain? {emoji}"
    },
    "en": {
      "morning": "Good morning {name}! Ready to learn? {emoji}",
      "afternoon": "Hello {name}! What shall we study today? {emoji}",
      "evening": "Hi {name}! Evening study session? {emoji}"
    }
  }
}
```

#### Response Adaptation (`response_adaptation`)
```json
{
  "intent_length_targets": {
    "request_explanation": { "targetWordCount": 80, "minWords": 50, "maxWords": 120 },
    "request_example": { "targetWordCount": 60, "minWords": 40, "maxWords": 90 },
    "request_hint": { "targetWordCount": 25, "minWords": 15, "maxWords": 40 }
  },
  "emotion_modifiers": {
    "excited": { "lengthMultiplier": 1.2, "structurePreference": "enthusiastic" },
    "confused": { "lengthMultiplier": 1.4, "structurePreference": "step_by_step" }
  }
}
```

#### Hint Progression (`hint_progression`)
```json
{
  "levels": [
    { "level": 1, "type": "conceptual", "guidance_en": "Think about...", "guidance_hi": "Socho..." },
    { "level": 2, "type": "directional", "guidance_en": "Consider...", "guidance_hi": "Dhyan do..." },
    { "level": 3, "type": "formula", "guidance_en": "Which formula?", "guidance_hi": "Konsa formula?" },
    { "level": 4, "type": "near_solution", "guidance_en": "Almost there!", "guidance_hi": "Bas thoda aur!" }
  ],
  "cooldown_ms": 15000,
  "max_hints_per_problem": 4
}
```

---

### 2. **Unity Avatar Management**

#### Unity Settings (`unity_settings`)
```json
{
  "gameObjectName": "AvatarController",
  "s3Prefix": "unity-assets/",
  "defaultAvatar": "priya",
  "avatarStateConfig": {
    "loadingTimeout": 30000,
    "handshakeTimeout": 5000,
    "errorRetryAttempts": 3
  },
  "buildRequirements": {
    "requiredFiles": ["Build.data.gz", "Build.wasm.gz", "Build.framework.js.gz", "Build.loader.js"],
    "maxBuildSize": 104857600
  }
}
```

---

### 3. **TTS/STT Provider Settings**

#### Voice Providers (`voice_providers`)
```json
{
  "primary": "sarvam",
  "fallback": "polly",
  "sarvam": {
    "enabled": true,
    "baseUrl": "https://api.sarvam.ai",
    "maxCharsPerRequest": 1000,
    "supportedLanguages": ["hi", "en"]
  },
  "polly": {
    "enabled": true,
    "region": "ap-south-1",
    "voices": {
      "hi": { "voiceId": "Aditi", "engine": "neural" },
      "en": { "voiceId": "Joanna", "engine": "neural" }
    }
  },
  "assemblyai": {
    "enabled": false,
    "sttModel": "best"
  }
}
```

#### Circuit Breaker Config (`circuit_breaker_config`)
```json
{
  "sarvam_tts": {
    "failureThreshold": 5,
    "successThreshold": 2,
    "timeout": 30000,
    "monitoringPeriod": 60000
  },
  "polly_tts": {
    "failureThreshold": 5,
    "successThreshold": 2,
    "timeout": 30000,
    "monitoringPeriod": 60000
  }
}
```

#### Voice Enhancement (`voice_enhancement`)
```json
{
  "enableMathSpeech": true,
  "enablePauses": true,
  "enableEmphasis": true,
  "technicalTerms": {
    "physics": ["momentum", "velocity", "acceleration", "force"],
    "chemistry": ["electron", "proton", "oxidation", "catalyst"],
    "biology": ["DNA", "RNA", "cell", "mitosis"],
    "math": ["theorem", "equation", "derivative", "integral"]
  },
  "hinglishTerms": ["veg", "gati", "tvaran", "bal", "urja", "shakti"]
}
```

---

### 4. **API Provider Management**

#### API Keys (`api_keys`)
```json
{
  "openai": {
    "enabled": true,
    "defaultModel": "gpt-4o",
    "fallbackModel": "gpt-4o-mini",
    "maxTokens": 16384,
    "temperature": 0.7
  },
  "gemini": {
    "enabled": true,
    "defaultModel": "gemini-1.5-flash"
  },
  "anthropic": {
    "enabled": false,
    "defaultModel": "claude-3-haiku-20240307"
  },
  "aws": {
    "region": "ap-south-1",
    "s3BucketName": "doc-sathi"
  }
}
```

---

### 5. **Caching & Performance**

#### Redis Configuration (`redis_config`)
```json
{
  "enabled": true,
  "provider": "upstash",
  "ttsCache": {
    "enabled": true,
    "ttl": 2592000,
    "maxSize": 10000
  },
  "semanticCache": {
    "enabled": true,
    "ttl": 3600,
    "similarityThreshold": 0.85
  },
  "sessionContext": {
    "enabled": true,
    "ttl": 1800
  }
}
```

---

### 6. **Platform Settings**

#### Feature Flags (`feature_flags`)
```json
{
  "avatarLipSync": true,
  "audioCompression": false,
  "streamingTTS": true,
  "emotionDetection": true,
  "semanticCaching": true,
  "rateLimit": false
}
```

#### Quiz Defaults (`quiz_defaults`)
```json
{
  "questionCount": 10,
  "types": ["mcq_single", "mcq_multi"],
  "difficulty": "medium",
  "languages": ["en", "hi"]
}
```

#### Study Plan Defaults (`study_plan_defaults`)
```json
{
  "intensityLevels": ["light", "regular", "intense"],
  "sessionDurations": [30, 45, 60, 90],
  "gradeLevels": ["High School", "Undergraduate"],
  "defaultLanguage": "en"
}
```

---

## 🛠️ Backend API Structure

### Routes (`server/routes/admin.ts`)

```typescript
// Admin Auth Middleware
router.use(isAdmin); // Check if user has admin role

// Configuration Management
GET    /api/admin/configs                    // List all configs by category
GET    /api/admin/configs/:category          // Get configs for specific category
GET    /api/admin/configs/:category/:key     // Get specific config
POST   /api/admin/configs                    // Create new config
PUT    /api/admin/configs/:id                // Update config
DELETE /api/admin/configs/:id                // Delete config (soft delete)

// Tutor Management
GET    /api/admin/tutor/personas             // Get all personas
PUT    /api/admin/tutor/personas/:id         // Update persona
GET    /api/admin/tutor/prompts              // Get system prompts
PUT    /api/admin/tutor/prompts/:language    // Update prompts
GET    /api/admin/tutor/first-messages       // Get first message templates
PUT    /api/admin/tutor/first-messages       // Update templates

// Unity Build Management
GET    /api/admin/unity/builds               // List all builds
GET    /api/admin/unity/builds/:id           // Get build details
POST   /api/admin/unity/builds/upload        // Upload new build (presigned URL)
POST   /api/admin/unity/builds/:id/activate  // Activate build
DELETE /api/admin/unity/builds/:id           // Delete build from S3

// Voice Provider Management
GET    /api/admin/voice/providers            // Get provider configs
PUT    /api/admin/voice/providers/:provider  // Update provider settings
GET    /api/admin/voice/circuit-breaker      // Get circuit breaker stats
PUT    /api/admin/voice/circuit-breaker      // Update CB config

// API Management
GET    /api/admin/api/providers              // Get all API provider settings
PUT    /api/admin/api/providers/:provider    // Update provider config
POST   /api/admin/api/test-connection        // Test API connection

// Cache & Performance
GET    /api/admin/cache/stats                // Get cache statistics
DELETE /api/admin/cache/clear/:type          // Clear specific cache
PUT    /api/admin/cache/config               // Update cache settings

// System Settings
GET    /api/admin/system/feature-flags       // Get feature flags
PUT    /api/admin/system/feature-flags       // Update flags
GET    /api/admin/system/rate-limits         // Get rate limit configs
PUT    /api/admin/system/rate-limits         // Update rate limits

// Audit & Monitoring
GET    /api/admin/audit/logs                 // Get audit trail
GET    /api/admin/audit/logs/:configId       // Get config change history
GET    /api/admin/monitoring/health          // System health check
GET    /api/admin/monitoring/metrics         // Performance metrics

// Import/Export
POST   /api/admin/import                     // Import config backup
GET    /api/admin/export                     // Export all configs
POST   /api/admin/restore/:timestamp         // Restore from backup
```

---

## 🎨 Frontend UI Structure

### Admin Panel Layout (`client/src/pages/AdminPanel.tsx`)

```
AdminPanel/
├── Navigation (Sidebar)
│   ├── Dashboard
│   ├── AI Tutor
│   │   ├── Personas
│   │   ├── Prompts
│   │   ├── First Messages
│   │   ├── Response Settings
│   │   └── Hint Progression
│   ├── Unity Avatar
│   │   ├── Build Management
│   │   ├── Active Build
│   │   └── Settings
│   ├── Voice Services
│   │   ├── Providers
│   │   ├── Circuit Breaker
│   │   └── Enhancement
│   ├── API Management
│   │   ├── OpenAI
│   │   ├── Gemini
│   │   ├── Anthropic
│   │   └── AWS
│   ├── Caching
│   │   ├── Redis Config
│   │   ├── TTS Cache
│   │   └── Semantic Cache
│   ├── System
│   │   ├── Feature Flags
│   │   ├── Rate Limits
│   │   ├── Quiz Defaults
│   │   └── Study Plans
│   └── Monitoring
│       ├── Audit Logs
│       ├── Health Check
│       └── Metrics
└── Content Area
    ├── Config Editor (JSON/Form hybrid)
    ├── Live Preview Panel
    ├── Version History
    └── Action Bar (Save/Cancel/Revert)
```

### Key Components

#### 1. **Config Editor Component** (`client/src/components/admin/ConfigEditor.tsx`)
- Dual mode: JSON editor + Form fields
- Real-time validation (Zod schemas)
- Syntax highlighting for JSON
- Auto-save with debounce
- Rollback to previous versions

#### 2. **Unity Build Uploader** (`client/src/components/admin/UnityBuildUploader.tsx`)
- Drag & drop ZIP upload
- Progress tracking
- S3 direct upload via presigned URL
- Automatic backup of old build
- Build validation (file structure check)
- Activate/Deactivate builds

#### 3. **Persona Editor** (`client/src/components/admin/PersonaEditor.tsx`)
- Name, gender, subjects
- Personality traits (tags)
- Catchphrases (editable list)
- Voice settings (Sarvam + Polly)
- Language style sliders (Hindi/English %)
- Preview voice synthesis

#### 4. **Prompt Editor** (`client/src/components/admin/PromptEditor.tsx`)
- Language tabs (Hindi/Hinglish, English)
- Core prompt textarea
- Intent-specific overrides (expandable sections)
- Template variables autocomplete
- Test prompt with sample inputs

#### 5. **Audit Log Viewer** (`client/src/components/admin/AuditLogViewer.tsx`)
- Filterable table (user, date, category)
- Diff viewer (old vs new values)
- Rollback button
- Export logs (CSV/JSON)

---

## 🔐 Access Control

### Admin Role System

```typescript
// User table addition
export const users = pgTable("users", {
  // ... existing fields
  role: varchar("role").default('user'), // 'user', 'admin', 'super_admin'
  permissions: jsonb("permissions").$type<string[]>(), // ['edit_personas', 'manage_builds', 'view_audit']
});

// Permission checks
const ADMIN_PERMISSIONS = {
  EDIT_PERSONAS: 'edit_personas',
  EDIT_PROMPTS: 'edit_prompts',
  MANAGE_UNITY: 'manage_unity_builds',
  MANAGE_API_KEYS: 'manage_api_keys',
  EDIT_CACHE: 'edit_cache_config',
  VIEW_AUDIT: 'view_audit_logs',
  SYSTEM_SETTINGS: 'edit_system_settings',
  SUPER_ADMIN: 'super_admin',
};
```

---

## 🧪 Testing & Validation

### Config Validation (`server/services/configValidator.ts`)

```typescript
// Validate before saving
export class ConfigValidator {
  validatePersona(persona: PersonaConfig): ValidationResult
  validatePrompt(prompt: SystemPrompt): ValidationResult
  validateUnityBuild(build: UnityBuild): ValidationResult
  validateVoiceProvider(config: VoiceProviderConfig): ValidationResult
  
  // Test connections
  async testOpenAIConnection(apiKey: string): Promise<boolean>
  async testSarvamConnection(apiKey: string): Promise<boolean>
  async testRedisConnection(url: string): Promise<boolean>
}
```

### Live Preview System

```typescript
// Test config changes before applying
POST /api/admin/test/persona/:id        // Test persona with sample message
POST /api/admin/test/prompt             // Test prompt with sample input
POST /api/admin/test/voice              // Synthesize test audio
POST /api/admin/test/unity-connection   // Test Unity GameObject communication
```

---

## 📦 Import/Export Format

### Backup Structure (`vaktaai-config-backup-YYYYMMDD-HHMMSS.json`)

```json
{
  "version": "1.0.0",
  "timestamp": "2025-10-10T20:47:00Z",
  "exportedBy": "admin@vaktaai.com",
  "configs": {
    "tutor_personas": {...},
    "system_prompts": {...},
    "first_messages": {...},
    "unity_settings": {...},
    "voice_providers": {...},
    "api_keys": {
      "openai": { "enabled": true, "defaultModel": "gpt-4o" },
      // API keys excluded for security
    },
    "cache_config": {...},
    "feature_flags": {...},
    "quiz_defaults": {...}
  },
  "unityBuilds": [
    {
      "id": "...",
      "version": "1.0.0",
      "isActive": true,
      "files": {...}
    }
  ]
}
```

---

## 🚀 Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- ✅ Database schema (adminConfigs, configAuditLog, unityBuilds)
- ✅ Backend API routes structure
- ✅ Admin authentication middleware
- ✅ Config validation service

### Phase 2: AI Tutor Management (Week 2)
- ✅ Persona editor UI
- ✅ Prompt editor UI
- ✅ First message templates
- ✅ Response adaptation settings

### Phase 3: Unity Build Management (Week 3)
- ✅ Build upload flow (ZIP → S3)
- ✅ Build activation system
- ✅ GameObject name configuration
- ✅ Version history

### Phase 4: Voice & API Management (Week 4)
- ✅ Provider settings UI
- ✅ Circuit breaker config
- ✅ API key management (encrypted)
- ✅ Connection testing

### Phase 5: System & Monitoring (Week 5)
- ✅ Feature flags UI
- ✅ Cache management
- ✅ Audit log viewer
- ✅ Health monitoring dashboard

### Phase 6: Import/Export & Polish (Week 6)
- ✅ Backup/Restore system
- ✅ Live preview testing
- ✅ UI/UX refinements
- ✅ Documentation

---

## 📊 Monitoring Dashboard

### Metrics to Track

```typescript
interface AdminMetrics {
  configChanges: {
    last24Hours: number;
    lastWeek: number;
    byCategory: Record<string, number>;
  };
  unityBuilds: {
    totalBuilds: number;
    activeVersion: string;
    uploadSuccess: number;
    uploadFailed: number;
  };
  voiceServices: {
    ttsRequests: number;
    cacheHitRate: number;
    circuitBreakerStatus: Record<string, 'CLOSED' | 'OPEN' | 'HALF_OPEN'>;
    providerHealthy: Record<string, boolean>;
  };
  apiUsage: {
    openaiCalls: number;
    geminiCalls: number;
    totalCost: number;
  };
  cacheStats: {
    redisConnected: boolean;
    ttsCacheSize: number;
    semanticCacheHits: number;
  };
}
```

---

## 🔒 Security Considerations

1. **API Key Encryption**: Store encrypted in DB, decrypt only when needed
2. **Audit Trail**: Every config change logged with user, IP, timestamp
3. **Role-Based Access**: Fine-grained permissions per admin section
4. **Rate Limiting**: Prevent abuse of admin endpoints
5. **Backup Rotation**: Auto-delete backups older than 30 days
6. **Change Approval**: Optional two-factor auth for critical changes
7. **Rollback Protection**: Prevent accidental deletion of active configs

---

## 📝 Notes

- **Database Migration**: Use `npm run db:push --force` for schema updates
- **Config Cache**: In-memory cache for frequently accessed configs (TTL: 5 min)
- **WebSocket Sync**: Broadcast config changes to active sessions
- **Unity Upload**: Max 100MB build size, automatic compression
- **API Testing**: Test connections before saving credentials
- **Audit Retention**: Keep audit logs for 90 days minimum

---

This architecture provides **complete admin control** over VaktaAI platform without touching code for routine changes.
