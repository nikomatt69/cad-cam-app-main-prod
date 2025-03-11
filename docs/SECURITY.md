# Security Documentation

## Overview
This document outlines security measures and best practices implemented in the CAD/CAM application.

## Authentication & Authorization

### User Authentication
```typescript
// Implementation using NextAuth.js
import NextAuth from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';

export default NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    // OAuth providers
    // Email provider
    // Credentials provider
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    }
  }
});
```

### Authorization Middleware
```typescript
// Middleware for role-based access control
export function withAuth(handler: NextApiHandler, roles: UserRole[]) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getSession({ req });
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (roles.length && !roles.includes(session.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    return handler(req, res);
  };
}
```

## Data Protection

### Encryption
```typescript
// Data encryption utilities
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export const encrypt = (text: string): EncryptedData => {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', process.env.ENCRYPTION_KEY!, iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  
  return {
    iv: iv.toString('hex'),
    content: encrypted.toString('hex'),
    tag: cipher.getAuthTag().toString('hex')
  };
};
```

### Data Sanitization
```typescript
// Input sanitization middleware
import { sanitize } from 'isomorphic-dompurify';

export const sanitizeInput = (req: NextApiRequest, res: NextApiResponse, next: NextFunction) => {
  req.body = sanitize(req.body);
  next();
};
```

## API Security

### Rate Limiting
```typescript
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});
```

### CORS Configuration
```typescript
// cors.config.ts
export const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
};
```

## File Security

### Upload Validation
```typescript
// File upload security
const validateFile = (file: Express.Multer.File) => {
  const allowedTypes = ['model/step', 'model/stl', 'model/obj'];
  const maxSize = 50 * 1024 * 1024; // 50MB
  
  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error('Invalid file type');
  }
  
  if (file.size > maxSize) {
    throw new Error('File too large');
  }
};
```

### Secure Storage
```typescript
// S3 storage configuration
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

export const uploadToS3 = async (file: Buffer, key: string) => {
  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    Body: file,
    ServerSideEncryption: 'AES256'
  }));
};
```

## Database Security

### Query Safety
```typescript
// Using Prisma's built-in SQL injection protection
const safeQuery = await prisma.user.findMany({
  where: {
    email: {
      contains: userInput // Safe from SQL injection
    }
  }
});
```

### Connection Security
```typescript
// Database connection with SSL
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  ssl      = true
}
```

## Infrastructure Security

### Docker Security
```dockerfile
# Secure Dockerfile configuration
FROM node:16-alpine

# Run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Set secure permissions
COPY --chown=appuser:appgroup . .

# Use specific versions
RUN npm ci --production

# Remove unnecessary files
RUN rm -rf tests/ documentation/
```

### Network Security
```nginx
# Nginx security configuration
server {
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header Content-Security-Policy "default-src 'self'";
}
```

## Monitoring & Logging

### Security Logging
```typescript
// Security event logging
import winston from 'winston';

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'security-service' },
  transports: [
    new winston.transports.File({ filename: 'security.log' })
  ]
});
```

### Audit Trail
```typescript
// Audit logging middleware
const auditLog = async (req: NextApiRequest, res: NextApiResponse, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    securityLogger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: Date.now() - startTime,
      user: req.user?.id
    });
  });
  
  next();
};
```

## Incident Response

### Security Alerts
```typescript
// Security alert system
const alertOnSuspiciousActivity = async (event: SecurityEvent) => {
  if (event.severity >= SecurityLevel.HIGH) {
    await Promise.all([
      notifySecurityTeam(event),
      logSecurityEvent(event),
      takeAutomatedAction(event)
    ]);
  }
};
```

### Incident Handling
1. Detection
2. Analysis
3. Containment
4. Eradication
5. Recovery
6. Lessons Learned

## Compliance

### GDPR Compliance
```typescript
// GDPR data handling
const handleDataRequest = async (userId: string, requestType: 'export' | 'delete') => {
  if (requestType === 'export') {
    const userData = await exportUserData(userId);
    return formatDataExport(userData);
  } else {
    await deleteUserData(userId);
    await notifyUserDeletion(userId);
  }
};
```

### Security Standards
- ISO 27001 compliance
- OWASP Top 10 mitigation
- PCI DSS requirements
- SOC 2 compliance

## Security Testing

### Penetration Testing
```typescript
// Security test cases
describe('Security Tests', () => {
  it('should prevent XSS attacks', async () => {
    const maliciousInput = '<script>alert("xss")</script>';
    const response = await request(app)
      .post('/api/data')
      .send({ content: maliciousInput });
    
    expect(response.body.content).not.toContain('<script>');
  });
});
```

### Vulnerability Scanning
```bash
# Regular security scans
npm audit
snyk test
```

## Security Updates

### Dependency Management
```json
{
  "scripts": {
    "security-audit": "npm audit",
    "update-deps": "npm update",
    "check-updates": "ncu"
  }
}
```

### Update Procedures
1. Regular dependency updates
2. Security patch application
3. Change documentation
4. Testing after updates