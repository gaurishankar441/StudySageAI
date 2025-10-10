import { Router } from 'express';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../objectStorage';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || '';
const UNITY_S3_PREFIX = 'unity-assets/'; // S3 folder for Unity files

// Unity file mappings
const UNITY_FILES = {
  'Build.data.gz': 'client/public/unity-avatar/Build/Build.data.gz',
  'Build.wasm.gz': 'client/public/unity-avatar/Build/Build.wasm.gz',
  'Build.framework.js.gz': 'client/public/unity-avatar/Build/Build.framework.js.gz',
};

/**
 * Upload Unity assets to S3 (one-time setup)
 * Only uploads if files don't exist in S3
 */
async function uploadUnityAssetsToS3() {
  console.log('[Unity S3] 📦 Checking Unity assets in S3...');
  
  for (const [s3Key, localPath] of Object.entries(UNITY_FILES)) {
    const fullS3Key = UNITY_S3_PREFIX + s3Key;
    const fullLocalPath = path.resolve(localPath);
    
    try {
      // Check if file exists in S3
      const headCommand = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fullS3Key,
      });
      
      await s3Client.send(headCommand);
      console.log(`[Unity S3] ✅ ${s3Key} already in S3 (key: ${fullS3Key})`);
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.name === 'NotFound') {
        // File doesn't exist in S3, upload it
        console.log(`[Unity S3] ⬆️ Uploading ${s3Key} to S3...`);
        
        const fileBuffer = fs.readFileSync(fullLocalPath);
        const contentType = s3Key.endsWith('.gz') 
          ? (s3Key.includes('.wasm') ? 'application/wasm' : 'application/javascript')
          : 'application/octet-stream';
        
        const uploadCommand = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: fullS3Key,
          Body: fileBuffer,
          ContentType: contentType,
          ContentEncoding: s3Key.endsWith('.gz') ? 'gzip' : undefined,
          CacheControl: 'public, max-age=31536000, immutable', // Cache for 1 year
        });
        
        await s3Client.send(uploadCommand);
        console.log(`[Unity S3] ✅ ${s3Key} uploaded successfully (key: ${fullS3Key}, size: ${fileBuffer.length} bytes)`);
      } else {
        console.error(`[Unity S3] ❌ Error checking ${s3Key}:`, error);
      }
    }
  }
  
  console.log('[Unity S3] 🎉 All Unity assets ready in S3!');
}

/**
 * GET /api/unity-assets/urls
 * Returns presigned URLs for Unity build files
 */
router.get('/urls', async (req, res) => {
  try {
    const urls: Record<string, string> = {};
    
    for (const s3Key of Object.keys(UNITY_FILES)) {
      const fullS3Key = UNITY_S3_PREFIX + s3Key;
      
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fullS3Key,
      });
      
      // Generate presigned URL valid for 1 hour
      const presignedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 3600, // 1 hour
      });
      
      console.log(`[Unity S3] Generated presigned URL for ${s3Key}: ${presignedUrl.substring(0, 80)}...`);
      urls[s3Key] = presignedUrl;
    }
    
    res.json({
      success: true,
      urls,
    });
  } catch (error) {
    console.error('[Unity S3] Error generating presigned URLs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate Unity asset URLs',
    });
  }
});

// Initialize Unity assets in S3 on server startup
uploadUnityAssetsToS3().catch(err => {
  console.error('[Unity S3] Failed to upload Unity assets:', err);
});

export default router;
