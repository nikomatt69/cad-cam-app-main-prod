---
title: "Database Schema"
description: "Complete documentation of the CAD/CAM application database schema"
---

# Database Schema Documentation

## Overview
The CAD/CAM FUN application uses PostgreSQL with Prisma ORM. Below is the detailed schema documentation.

## Core Models

<AccordionGroup>
  <Accordion title="User Model" icon="user">
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
  </Accordion>

  <Accordion title="Project Model" icon="folder">
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
  </Accordion>

  <Accordion title="Model" icon="cube">
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
  </Accordion>
</AccordionGroup>

## Manufacturing Models

<AccordionGroup>
  <Accordion title="Machine" icon="industry">
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
  </Accordion>

  <Accordion title="Tool" icon="screwdriver-wrench">
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
  </Accordion>

  <Accordion title="Material" icon="layer-group">
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
  </Accordion>
</AccordionGroup>

## Versioning Models

<AccordionGroup>
  <Accordion title="ModelVersion" icon="code-branch">
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
  </Accordion>

  <Accordion title="Toolpath" icon="route">
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
  </Accordion>
</AccordionGroup>

## Organization Models

<AccordionGroup>
  <Accordion title="Organization" icon="building">
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
  </Accordion>

  <Accordion title="ProjectShare" icon="share-nodes">
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
  </Accordion>
</AccordionGroup>

## Database Operations

### Migrations

<CodeGroup>
  ```bash Creating Migrations
  # Generate migration from schema changes
  npx prisma migrate dev --name migration_name

  # Apply migrations to database
  npx prisma migrate deploy
  ```

  ```bash Seeding Data
  # Run database seeds
  npx prisma db seed
  ```
</CodeGroup>

### Performance Optimization

<CardGroup cols={2}>
  <Card title="Key Indexes" icon="database">
    - User email (unique)
    - Project ownership
    - Model project association
    - Organization associations
    - Share permissions
  </Card>
  <Card title="Query Optimization" icon="magnifying-glass">
    - Use included relations
    - Implement pagination
    - Cache frequent queries
  </Card>
</CardGroup>

## Backup and Recovery

<Steps>
  <Step title="Backup Strategy">
    1. Daily full backups
    2. Hourly incremental backups
    3. Transaction log backups
  </Step>
  <Step title="Recovery Procedures">
    1. Point-in-time recovery
    2. Full database restoration
    3. Table-level recovery
  </Step>
</Steps>

## Security Considerations

<CardGroup cols={2}>
  <Card title="Data Protection" icon="shield-halved">
    - Encrypted sensitive fields
    - Row-level security
    - Access control policies
  </Card>
  <Card title="Audit Trail" icon="clock-rotate-left">
    - Creation timestamps
    - Update timestamps
    - User tracking
  </Card>
</CardGroup>

## Best Practices

<AccordionGroup>
  <Accordion title="Schema Design" icon="table">
    1. Use appropriate data types
    2. Implement proper constraints
    3. Maintain referential integrity
  </Accordion>
  <Accordion title="Query Performance" icon="bolt">
    1. Use efficient indexes
    2. Optimize join operations
    3. Implement connection pooling
  </Accordion>
  <Accordion title="Data Integrity" icon="shield-check">
    1. Use transactions
    2. Implement validation
    3. Maintain data consistency
  </Accordion>
</AccordionGroup>

<Note>
Remember to always follow security best practices and maintain proper documentation of any schema changes.
</Note>