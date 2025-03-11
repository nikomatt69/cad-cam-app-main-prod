# CAD/CAM FUN Documentation

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Architecture](#architecture)
4. [Features](#features)
5. [API Reference](#api-reference)
6. [Development Guide](#development-guide)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

## Introduction

CAD/CAM FUN is a comprehensive web-based platform that combines CAD (Computer-Aided Design) and CAM (Computer-Aided Manufacturing) functionalities with advanced AI integration. The platform enables users to design, model, and manufacture products through an intuitive interface.

### Key Features Overview
- Integrated CAD/CAM environment
- Advanced 2D/3D modeling
- AI-assisted design
- CNC machine integration
- Real-time collaboration
- Cloud-based storage
- Version control
- Material and tool libraries

## Getting Started

### System Requirements
- Node.js v16.x or higher
- PostgreSQL database
- Modern web browser (Chrome, Firefox, Edge, Safari)
- npm or yarn package manager

### Installation Steps

1. Clone the repository:
```bash
git clone https://github.com/nikomatt69/cad-cam-app-main.git
cd cad-cam-app-main
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Configure environment variables:
Create a `.env` file with:
```env
DATABASE_URL=your_postgres_connection_string
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_key
ANTHROPIC_API_KEY=your_claude_api_key
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=your_aws_region
```

4. Initialize database:
```bash
npm run prisma:generate
npm run prisma:migratedev
```

5. Start development server:
```bash
npm run dev
```

## Architecture

### Technology Stack
- Frontend: React, Next.js, Tailwind CSS
- Backend: Next.js API Routes
- Database: PostgreSQL with Prisma ORM
- Authentication: NextAuth.js
- 3D Rendering: Three.js
- State Management: Zustand
- AI Integration: Claude (Anthropic)
- Cloud Storage: AWS S3

### Project Structure
```
cad-cam-app-main/
├── prisma/                  # Database schema and migrations
├── public/                  # Static assets
├── src/
│   ├── components/          # React components
│   ├── contexts/           # React contexts
│   ├── hooks/              # Custom hooks
│   ├── lib/                # Utility functions
│   ├── pages/              # Next.js pages
│   ├── store/              # State management
│   └── types/              # TypeScript definitions
```

## Features

### CAD Editor
- 2D/3D modeling tools
- Parametric design capabilities
- Component library integration
- Version control
- AI-assisted design features

### CAM Editor
- Tool path generation
- G-code creation and validation
- Machine configuration
- Material and tool management
- AI-optimized machining paths

### Project Management
- Multi-user workspaces
- Role-based access control
- Version tracking
- Component sharing

### Resource Management
- Material library
- Tool library
- Machine profiles
- Component libraries

## API Reference

### Authentication Endpoints
```typescript
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/logout
```

### CAD Operations
```typescript
POST /api/cad/model/create
PUT /api/cad/model/update
GET /api/cad/model/:id
DELETE /api/cad/model/:id
```

### CAM Operations
```typescript
POST /api/cam/toolpath/generate
POST /api/cam/gcode/validate
GET /api/cam/machine/:id/config
```

### AI Integration
```typescript
POST /api/ai/analyze-design
POST /api/ai/optimize-toolpath
POST /api/ai/generate-documentation
```

## Development Guide

### Code Style
- Follow TypeScript best practices
- Use functional components with hooks
- Implement proper error handling
- Write unit tests for critical functionality

### Testing
```bash
npm run test        # Run unit tests
npm run test:e2e    # Run end-to-end tests
npm run lint        # Check code style
```

### Building for Production
```bash
npm run build
npm run start
```

## Deployment

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Configure environment variables
3. Deploy using Vercel dashboard

### Manual Deployment
1. Build the application
2. Configure production environment
3. Set up database migrations
4. Configure reverse proxy
5. Enable SSL

## Troubleshooting

### Common Issues

#### Database Connection
- Verify PostgreSQL connection string
- Check database permissions
- Ensure migrations are up to date

#### Authentication Problems
- Verify environment variables
- Check NextAuth configuration
- Validate user permissions

#### Performance Issues
- Optimize database queries
- Check browser console for errors
- Monitor server resources

### Support

For technical support:
- Email: support@cadcamfun.xyz
- GitHub Issues: [Project Issues](https://github.com/nikomatt69/cad-cam-app-main/issues)
- Documentation: [docs.cadcamfun.xyz](https://docs.cadcamfun.xyz)

## License

This project is protected under a Proprietary Limited Use License. See [LICENSE](LICENSE) for details.

---

© 2025 CAD/CAM FUN. All rights reserved.