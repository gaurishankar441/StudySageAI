# 🧪 Admin Panel Testing Guide

**Date**: October 11, 2025  
**Admin Credentials**: `vaktaai12@example.com` / `admin123`

---

## 📋 Testing Checklist

### ✅ **Task 1: Admin Access**
**Status**: Ready for browser testing

1. **Login**
   - Navigate to `/` and click "Sign In"
   - Email: `vaktaai12@example.com`
   - Password: `admin123`
   - Should successfully login

2. **Access Admin Panel**
   - Navigate to `/admin`
   - Should see 6 admin section cards:
     - AI Tutor Config
     - Unity Build
     - Voice Services
     - API Management
     - System Settings (not implemented)
     - Audit Logs

3. **Verify Stats**
   - Check "System Status" section shows real data:
     - Active Personas (should be 0 initially)
     - Unity Build Version (should be "None" initially)
     - Total Configs (should be 0 initially)

---

### **Task 2: AI Tutor Config** (`/admin/tutor`)

#### **Personas Tab**
1. **Add New Persona**
   - Click "Add Persona" button
   - Fill in:
     - Name: "Test Tutor"
     - Description: "A helpful test tutor"
     - Tone: "friendly"
     - Expertise: "mathematics, physics"
   - Click "Save"
   - ✅ Should appear in personas list

2. **Edit Persona**
   - Click Edit icon on "Test Tutor"
   - Change description to "An updated test tutor"
   - Click "Save"
   - ✅ Should update in list

3. **Delete Persona**
   - Click Delete icon on "Test Tutor"
   - Confirm deletion
   - ✅ Should disappear from list

#### **System Prompts Tab**
1. **Select Language**: Choose "Hindi" or "English"
2. **Select Intent**: Choose "greeting" or "teaching"
3. **Edit Prompt**: Modify the system prompt text
4. **Click "Save Prompts"**
   - ✅ Should show success toast
   - ✅ Refresh page - changes should persist

#### **First Messages Tab**
1. **Select Language**: Choose "Hindi" or "English"
2. **Edit Greeting Template**: Modify the greeting message
3. **Edit Response Variations**: Add/edit response options
4. **Click "Save Messages"**
   - ✅ Should show success toast
   - ✅ Refresh page - changes should persist

---

### **Task 3: Voice Settings** (`/admin/voice`)

#### **TTS Configuration**
1. **Primary Provider**: Select "Sarvam AI" or "AWS Polly"
2. **Sarvam AI Settings** (if selected):
   - Speaker: "arvind" (Hindi) or "meera" (English)
   - Pitch: Adjust slider (-10 to 10)
   - Pace: Adjust slider (0.5 to 2.0)
   - Loudness: Adjust slider (-20 to 20)
3. **AWS Polly Settings** (if selected):
   - Voice ID: Select from dropdown
   - Engine: "neural" or "standard"
   - Speaking Rate: Adjust slider
4. **Fallback Provider**: Select alternate TTS provider
5. **TTS Caching**:
   - TTL: Set cache duration (e.g., 86400 seconds)
   - Max Size: Set max cache entries (e.g., 1000)
6. **Click "Save TTS Config"**
   - ✅ Should show success toast
   - ✅ Refresh page - settings should persist

#### **STT Configuration**
1. **Primary Provider**: Select "Sarvam AI" or "AssemblyAI"
2. **Sarvam AI Settings** (if selected):
   - Model: "saarika:v1" or "saarika:v2"
   - Language Code: "hi-IN" or "en-IN"
3. **AssemblyAI Settings** (if selected):
   - Language: Select from dropdown
4. **Fallback Provider**: Select alternate STT provider
5. **Click "Save STT Config"**
   - ✅ Should show success toast
   - ✅ Refresh page - settings should persist

---

### **Task 4: API Management** (`/admin/api`)

#### **OpenAI Configuration**
1. **Toggle Enable/Disable**: Click switch
2. **API Key**: Enter OpenAI API key
   - Click eye icon to show/hide
3. **Organization ID**: Enter (optional)
4. **Chat Model**: Enter model name (e.g., "gpt-4o-mini")
5. **Click "Save All Keys"**
   - ✅ Should show success toast (with "encrypted" note)
   - ✅ Refresh page - masked key should persist

#### **Google Gemini Configuration**
1. **Toggle Enable/Disable**: Click switch
2. **API Key**: Enter Gemini API key
   - Click eye icon to show/hide
3. **Chat Model**: Enter model name (e.g., "gemini-1.5-flash")
4. **Click "Save All Keys"**
   - ✅ Should save successfully

#### **Anthropic Claude Configuration**
1. **Toggle Enable/Disable**: Click switch
2. **API Key**: Enter Claude API key
3. **Chat Model**: Enter model name
4. **Click "Save All Keys"**
   - ✅ Should save successfully

#### **Sarvam AI Configuration**
1. **Toggle Enable/Disable**: Click switch
2. **API Key**: Enter Sarvam API key
3. **Service Toggles**:
   - Enable/disable TTS
   - Enable/disable STT
4. **Click "Save All Keys"**
   - ✅ Should save successfully

#### **AWS Configuration**
1. **Toggle Enable/Disable**: Click switch
2. **Access Key ID**: Enter AWS access key
   - Click eye icon to show/hide
3. **Secret Access Key**: Enter AWS secret key
   - Click eye icon to show/hide
4. **Region**: Enter region (e.g., "ap-south-1")
5. **Service Toggles**:
   - Enable/disable S3
   - Enable/disable Polly
6. **Click "Save All Keys"**
   - ✅ Should save successfully

---

### **Task 5: Audit Logs** (`/admin/audit`)

1. **View Stats**
   - Total Logs count
   - Filtered Results count
   - Unique Actions count

2. **Search Functionality**
   - Enter text in search box (e.g., user ID, action name)
   - ✅ Results should filter in real-time

3. **Filter by Action Type**
   - Select action from dropdown
   - ✅ Results should filter

4. **View Log Details**
   - Each log card should show:
     - Action name with colored badge
     - User ID and timestamp
     - IP address (if available)
     - Previous/New value comparison (side-by-side)

---

### **Task 6: System Dashboard** (`/admin`)

1. **Stats Cards**
   - Total Configs: Should show count
   - Tutor Personas: Should show count
   - Unity Builds: Should show count
   - Audit Logs: Should show count

2. **Active Configuration Card**
   - Should show configs by category (tutor, voice, api)
   - Each category shows settings count
   - Active Unity build displayed (if any)

3. **Recent Activity Card**
   - Shows last 5 audit logs
   - Each log shows action and timestamp
   - "View All" link to `/admin/audit`

4. **Quick Actions**
   - All 4 admin section buttons should navigate correctly

---

## 🔍 **Integration Testing**

After UI testing, verify backend integration:

### **1. Database Verification**
```sql
-- Check configs were saved
SELECT category, key FROM admin_configs;

-- Check audit logs were created
SELECT action, created_at FROM config_audit_log ORDER BY created_at DESC LIMIT 10;
```

### **2. Cache Invalidation**
- Make a config change
- Refresh the page
- ✅ New value should appear (cache was invalidated)

### **3. Encryption Verification**
```sql
-- API keys should NOT be plain text
SELECT value FROM admin_configs WHERE category = 'api' AND key = 'keys';
```
✅ Value should be encrypted/hashed, not readable

---

## ✅ **Expected Results Summary**

| Feature | Expected Behavior |
|---------|------------------|
| **Login** | Admin user can access `/admin` |
| **Personas CRUD** | Add/Edit/Delete works, persists to DB |
| **Prompts Save** | Language-specific prompts save correctly |
| **Messages Save** | First messages save per language |
| **Voice Settings** | TTS/STT configs save and load |
| **API Keys** | Keys save encrypted, show/hide works |
| **Audit Logs** | All actions logged with user/IP/timestamp |
| **Search/Filter** | Logs filter by search term and action type |
| **Stats Display** | Dashboard shows real counts from DB |

---

## 🐛 **Known Issues**

1. **Vite HMR WebSocket Error** (Non-critical)
   - Error in browser console: `wss://localhost:undefined`
   - This is Vite HMR in Replit environment
   - Does NOT affect app functionality

2. **Initial Data**
   - Database is fresh (no personas, configs, builds)
   - This is expected for first-time testing

---

## 📝 **Testing Notes**

- Use browser DevTools Network tab to verify API calls
- Check browser Console for any errors
- All test IDs are added for automated testing later
- Admin user email: `vaktaai12@example.com`
- Admin user password: `admin123` (set for testing)

---

## 🚀 **After Testing**

Once all features verified:
1. Update `replit.md` with testing results
2. Create production admin user with secure password
3. Document any bugs found
4. Prepare for deployment
