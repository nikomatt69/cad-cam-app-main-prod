// src/pages/api/uploads/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm } from 'formidable';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { prisma } from 'src/lib/prisma';
import { requireAuth } from 'src/lib/api/auth';

// Configure API to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// Initialize S3 client
const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT || 'https://endpoint.4everland.co',
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await requireAuth(req, res);
  if (!userId) return;
  
  // Only handle POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  try {
    // Parse form data
    const form = new IncomingForm({
      keepExtensions: true,
      multiples: true,
    });
    
    const { fields, files } = await new Promise<any>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve({ fields, files });
      });
    });
    
    if (!files.file || files.file.length === 0) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const file = files.file[0];
    const { objectId, objectType, organizationId } = fields;
    
    // If organizationId is provided, verify membership
    if (organizationId && typeof organizationId === 'string') {
      const organizationMember = await prisma.userOrganization.findFirst({
        where: {
          userId,
          organizationId
        }
      });
      
      if (!organizationMember) {
        return res.status(403).json({ message: 'You are not a member of the specified organization' });
      }
    }
    
    // Generate S3 key
    let s3Key = `users/${userId}/uploads/`;
    
    // Add object prefix if provided
    if (objectType && objectId) {
      s3Key += `${objectType}/${objectId}/`;
    }
    
    // Add filename with timestamp to avoid conflicts
    const timestamp = Date.now();
    const filename = path.basename(file.filepath);
    s3Key += `${timestamp}-${filename}`;
    
    // Upload file to S3
    const fileContent = fs.readFileSync(file.filepath);
    
    const s3Result = await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME || 'cadcamfun',
        Key: s3Key,
        Body: fileContent,
        ContentType: file.mimetype,
      })
    );
    
    // Create file record in database
    const fileUpload = await prisma.fileUpload.create({
      data: {
        fileName: filename,
        s3Key,
        s3Bucket: process.env.S3_BUCKET_NAME || 'cadcamfun',
        s3ContentType: file.mimetype,
        s3Size: file.size,
        objectId: objectId || null,
        objectType: objectType || null,
        ownerId: userId,
        organizationId: organizationId || null,
      }
    });
    
    // Clean up temp file
    fs.unlinkSync(file.filepath);
    
    return res.status(201).json({
      success: true,
      file: fileUpload
    });
  } catch (error) {
    console.error('Failed to upload file:', error);
    return res.status(500).json({ message: 'Failed to upload file' });
  }
}