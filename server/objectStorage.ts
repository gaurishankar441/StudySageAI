import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  CopyObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Response } from "express";
import { randomUUID } from "crypto";
import {
  ObjectAclPolicy,
  ObjectPermission,
} from "./objectAcl";

// AWS S3 Client Configuration
export const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

// Get bucket name from environment
const getBucketName = (): string => {
  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("AWS_S3_BUCKET_NAME environment variable is not set");
  }
  return bucketName;
};

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// S3 Object wrapper to maintain compatibility
interface S3Object {
  key: string;
  bucket: string;
  metadata?: Record<string, string>;
}

export class ObjectStorageService {
  private bucketName: string;

  constructor() {
    this.bucketName = getBucketName();
  }

  // Gets the public object search paths (not needed for S3, kept for compatibility)
  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "public/";
    return pathsStr.split(",").map(p => p.trim()).filter(p => p.length > 0);
  }

  // Gets the private object directory prefix
  getPrivateObjectDir(): string {
    return process.env.PRIVATE_OBJECT_DIR || "private/uploads";
  }

  // Search for a public object from S3
  async searchPublicObject(filePath: string): Promise<S3Object | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const key = `${searchPath}/${filePath}`.replace(/\/+/g, '/');
      
      try {
        await s3Client.send(new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }));
        
        return {
          key,
          bucket: this.bucketName,
        };
      } catch (error: any) {
        if (error.name !== 'NotFound') {
          console.error(`Error checking object ${key}:`, error);
        }
        continue;
      }
    }
    return null;
  }

  // Download object from S3 and stream to response
  async downloadObject(s3Object: S3Object, res: Response, cacheTtlSec: number = 3600) {
    try {
      const command = new GetObjectCommand({
        Bucket: s3Object.bucket,
        Key: s3Object.key,
      });

      const response = await s3Client.send(command);

      // Get ACL policy from metadata
      const aclPolicy = this.parseAclFromMetadata(response.Metadata);
      const isPublic = aclPolicy?.visibility === "public";

      // Set response headers
      res.set({
        "Content-Type": response.ContentType || "application/octet-stream",
        "Content-Length": response.ContentLength?.toString() || "0",
        "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
        "ETag": response.ETag,
      });

      // Stream the body to response
      if (response.Body) {
        const stream = response.Body as any;
        stream.pipe(res);
      } else {
        res.status(404).json({ error: "File content not found" });
      }
    } catch (error: any) {
      console.error("Error downloading file from S3:", error);
      if (!res.headersSent) {
        // Return 404 for NotFound errors, 500 for others
        if (error.name === 'NotFound' || error.name === 'NoSuchKey') {
          res.status(404).json({ error: "File not found" });
        } else {
          res.status(500).json({ error: "Error downloading file" });
        }
      }
    }
  }

  // Get presigned URL for upload
  async getObjectEntityUploadURL(): Promise<string> {
    const privateDir = this.getPrivateObjectDir();
    const objectId = randomUUID();
    const key = `${privateDir}/${objectId}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    // Generate presigned URL valid for 15 minutes
    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 900,
    });

    return presignedUrl;
  }

  // Get S3 object from entity path
  async getObjectEntityFile(objectPath: string): Promise<S3Object> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const key = `${entityDir}${entityId}`;

    try {
      const response = await s3Client.send(new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }));

      return {
        key,
        bucket: this.bucketName,
        metadata: response.Metadata,
      };
    } catch (error: any) {
      if (error.name === 'NotFound' || error.name === 'NoSuchKey') {
        throw new ObjectNotFoundError();
      }
      throw error;
    }
  }

  // Download S3 object content as Buffer (for document processing)
  async downloadBuffer(s3Object: S3Object): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: s3Object.bucket,
        Key: s3Object.key,
      });

      const response = await s3Client.send(command);

      if (!response.Body) {
        throw new Error("No content in S3 object");
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const stream = response.Body as any;
      
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error: any) {
      console.error("Error downloading buffer from S3:", error);
      if (error.name === 'NotFound' || error.name === 'NoSuchKey') {
        throw new ObjectNotFoundError();
      }
      throw error;
    }
  }

  // Normalize object entity path from S3 URL
  normalizeObjectEntityPath(rawPath: string): string {
    // Handle S3 URLs
    if (rawPath.startsWith("https://") && rawPath.includes(".s3.")) {
      try {
        const url = new URL(rawPath);
        let pathname = url.pathname;
        
        // Remove leading bucket name if present in path
        if (pathname.startsWith(`/${this.bucketName}/`)) {
          pathname = pathname.slice(this.bucketName.length + 1);
        }
        
        // Remove leading slash
        if (pathname.startsWith('/')) {
          pathname = pathname.slice(1);
        }

        let objectEntityDir = this.getPrivateObjectDir();
        if (!objectEntityDir.endsWith("/")) {
          objectEntityDir = `${objectEntityDir}/`;
        }

        if (pathname.startsWith(objectEntityDir)) {
          const entityId = pathname.slice(objectEntityDir.length);
          return `/objects/${entityId}`;
        }
        
        return pathname;
      } catch (error) {
        console.error("Error parsing S3 URL:", error);
        return rawPath;
      }
    }

    return rawPath;
  }

  // Set ACL policy for object entity
  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    const s3Object = await this.getObjectEntityFile(normalizedPath);
    await this.setObjectAclPolicy(s3Object, aclPolicy);
    return normalizedPath;
  }

  // Set ACL policy as metadata
  private async setObjectAclPolicy(
    s3Object: S3Object,
    aclPolicy: ObjectAclPolicy
  ): Promise<void> {
    try {
      // Get current metadata first
      const headCommand = new HeadObjectCommand({
        Bucket: s3Object.bucket,
        Key: s3Object.key,
      });
      const currentMetadata = await s3Client.send(headCommand);

      // Use CopyObject to update metadata in-place without downloading/re-uploading
      // Preserve ALL existing headers to avoid metadata loss
      const copyCommand = new CopyObjectCommand({
        Bucket: s3Object.bucket,
        Key: s3Object.key,
        CopySource: `${s3Object.bucket}/${s3Object.key}`,
        MetadataDirective: "REPLACE",
        ...(currentMetadata.ContentType && { ContentType: currentMetadata.ContentType }),
        ...(currentMetadata.ContentDisposition && { ContentDisposition: currentMetadata.ContentDisposition }),
        ...(currentMetadata.CacheControl && { CacheControl: currentMetadata.CacheControl }),
        ...(currentMetadata.ContentEncoding && { ContentEncoding: currentMetadata.ContentEncoding }),
        ...(currentMetadata.ContentLanguage && { ContentLanguage: currentMetadata.ContentLanguage }),
        ...(currentMetadata.Expires && { Expires: currentMetadata.Expires }),
        Metadata: {
          ...(currentMetadata.Metadata ?? {}),
          'acl-policy': JSON.stringify(aclPolicy),
        },
      });

      await s3Client.send(copyCommand);
    } catch (error) {
      console.error("Error setting ACL policy:", error);
      throw error;
    }
  }

  // Get ACL policy from metadata
  private async getObjectAclPolicy(s3Object: S3Object): Promise<ObjectAclPolicy | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: s3Object.bucket,
        Key: s3Object.key,
      });
      const response = await s3Client.send(command);
      return this.parseAclFromMetadata(response.Metadata);
    } catch (error) {
      console.error("Error getting ACL policy:", error);
      return null;
    }
  }

  // Parse ACL from metadata
  private parseAclFromMetadata(metadata?: Record<string, string>): ObjectAclPolicy | null {
    if (!metadata || !metadata['acl-policy']) {
      return null;
    }
    try {
      return JSON.parse(metadata['acl-policy']);
    } catch (error) {
      console.error("Error parsing ACL policy:", error);
      return null;
    }
  }

  // Check if user can access object entity
  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: S3Object;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    const aclPolicy = await this.getObjectAclPolicy(objectFile);
    
    if (!aclPolicy) {
      return false;
    }

    // Public objects are readable by everyone
    if (aclPolicy.visibility === "public" && requestedPermission === ObjectPermission.READ) {
      return true;
    }

    // No user ID, can't check further
    if (!userId) {
      return false;
    }

    // Owner can always access
    if (aclPolicy.owner === userId) {
      return true;
    }

    // Check ACL rules (simplified for now)
    // You can extend this based on your ACL requirements
    if (aclPolicy.aclRules && aclPolicy.aclRules.length > 0) {
      // Implement ACL rule checking here based on your objectAcl.ts logic
      return false;
    }

    return false;
  }
}
