# Database Schema Documentation

## Overview
The CAD/CAM FUN application uses PostgreSQL with Prisma ORM. Below is the detailed schema documentation.

## Core Models

### User
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  password      String    // Hashed
  role          UserRole  @default(USER)
  organization  Organization? @relation(fields: [orgId], references: [id])
  orgId         String?
  projects      Project[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([email])
}

enum UserRole {
  ADMIN
  USER
  VIEWER
}
```

### Project
```prisma
model Project {
  id          String    @id @default(cuid())
  name        String
  description String?
  owner       User      @relation(fields: [ownerId], references: [id])
  ownerId     String
  models      Model[]
  shared      ProjectShare[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([ownerId])
}
```

### Model
```prisma
model Model {
  id          String    @id @default(cuid())
  name        String
  type        ModelType
  data        Json      // CAD/CAM data
  project     Project   @relation(fields: [projectId], references: [id])
  projectId   String
  versions    ModelVersion[]
  toolpaths   Toolpath[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([projectId])
}

enum ModelType {
  CAD_2D
  CAD_3D
  CAM
}
```

## Manufacturing Models

### Machine
```prisma
model Machine {
  id            String    @id @default(cuid())
  name          String
  type          String
  config        Json      // Machine configuration
  organization  Organization @relation(fields: [orgId], references: [id])
  orgId         String
  toolpaths     Toolpath[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([orgId])
}
```

### Tool
```prisma
model Tool {
  id            String    @id @default(cuid())
  name          String
  type          String
  specifications Json     // Tool specifications
  organization  Organization @relation(fields: [orgId], references: [id])
  orgId         String
  toolpaths     ToolpathTool[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([orgId])
}
```

### Material
```prisma
model Material {
  id            String    @id @default(cuid())
  name          String
  type          String
  properties    Json      // Material properties
  organization  Organization @relation(fields: [orgId], references: [id])
  orgId         String
  models        Model[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([orgId])
}
```

## Versioning Models

### ModelVersion
```prisma
model ModelVersion {
  id          String    @id @default(cuid())
  version     Int
  data        Json      // Version data
  model       Model     @relation(fields: [modelId], references: [id])
  modelId     String
  createdBy   User      @relation(fields: [userId], references: [id])
  userId      String
  createdAt   DateTime  @default(now())

  @@index([modelId])
  @@index([userId])
}
```

### Toolpath
```prisma
model Toolpath {
  id          String    @id @default(cuid())
  name        String
  gcode       String    // Generated G-code
  model       Model     @relation(fields: [modelId], references: [id])
  modelId     String
  machine     Machine   @relation(fields: [machineId], references: [id])
  machineId   String
  tools       ToolpathTool[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([modelId])
  @@index([machineId])
}
```

## Organization Models

### Organization
```prisma
model Organization {
  id          String    @id @default(cuid())
  name        String
  plan        PlanType  @default(FREE)
  users       User[]
  machines    Machine[]
  tools       Tool[]
  materials   Material[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

enum PlanType {
  FREE
  BASIC
  PRO
  ENTERPRISE
}
```

## Sharing and Permissions

### ProjectShare
```prisma
model ProjectShare {
  id          String    @id @default(cuid())
  project     Project   @relation(fields: [projectId], references: [id])
  projectId   String
  user        User      @relation(fields: [userId], references: [id])
  userId      String
  permission  Permission
  createdAt   DateTime  @default(now())

  @@unique([projectId, userId])
  @@index([userId])
}

enum Permission {
  VIEW
  EDIT
  MANAGE
}
```

## Database Migrations

### Creating Migrations
```bash
# Generate migration from schema changes
npx prisma migrate dev --name migration_name

# Apply migrations to database
npx prisma migrate deploy
```

### Seeding Data
```bash
# Run database seeds
npx prisma db seed
```

## Indexes and Performance

### Key Indexes
- User email (unique)
- Project ownership
- Model project association
- Organization associations
- Share permissions

### Query Optimization
- Use included relations
- Implement pagination
- Cache frequent queries

## Backup and Recovery

### Backup Strategy
1. Daily full backups
2. Hourly incremental backups
3. Transaction log backups

### Recovery Procedures
1. Point-in-time recovery
2. Full database restoration
3. Table-level recovery

## Security Considerations

### Data Protection
- Encrypted sensitive fields
- Row-level security
- Access control policies

### Audit Trail
- Creation timestamps
- Update timestamps
- User tracking

## Best Practices

### Schema Design
1. Use appropriate data types
2. Implement proper constraints
3. Maintain referential integrity

### Query Performance
1. Use efficient indexes
2. Optimize join operations
3. Implement connection pooling

### Data Integrity
1. Use transactions
2. Implement validation
3. Maintain data consistency