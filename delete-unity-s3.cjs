const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
const files = [
  'unity-assets/Build.data.gz',
  'unity-assets/Build.wasm.gz',
  'unity-assets/Build.framework.js.gz'
];

async function deleteOldBuild() {
  console.log('[S3 Cleanup] 🗑️ Deleting old Unity build from S3...');
  
  for (const key of files) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });
      await s3Client.send(command);
      console.log(`[S3 Cleanup] ✅ Deleted ${key}`);
    } catch (error) {
      console.error(`[S3 Cleanup] ❌ Error deleting ${key}:`, error.message);
    }
  }
  
  console.log('[S3 Cleanup] 🎉 Old Unity build deleted from S3!');
}

deleteOldBuild().catch(console.error);
