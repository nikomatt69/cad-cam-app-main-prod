# CAD/CAM FUN API Documentation

## Authentication API

### POST /api/auth/signup
Create a new user account.

**Request Body:**
```json
{
  "email": "string",
  "password": "string",
  "name": "string"
}
```

**Response:**
```json
{
  "user": {
    "id": "string",
    "email": "string",
    "name": "string",
    "createdAt": "string"
  }
}
```

### POST /api/auth/login
Authenticate a user.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "token": "string",
  "user": {
    "id": "string",
    "email": "string",
    "name": "string"
  }
}
```

## AI Integration API

### POST /api/ai/analyze-design
Analyze a CAD design using Claude AI.

**Request Body:**
```json
{
  "designData": "string",
  "analysisType": "structural|thermal|optimization",
  "parameters": {
    "maxTokens": number,
    "temperature": number
  }
}
```

### POST /api/ai/optimize-toolpath
Optimize CNC toolpaths using AI.

**Request Body:**
```json
{
  "gcode": "string",
  "machineConfig": {
    "type": "string",
    "capabilities": ["array"]
  },
  "optimizationGoals": {
    "speed": boolean,
    "quality": boolean,
    "toolLife": boolean
  }
}
```

## CAD Operations API

### POST /api/cad/model/create
Create a new CAD model.

**Request Body:**
```json
{
  "name": "string",
  "type": "2d|3d",
  "data": "string",
  "metadata": {
    "units": "string",
    "material": "string"
  }
}
```

### PUT /api/cad/model/update/{id}
Update an existing CAD model.

**Request Body:**
```json
{
  "data": "string",
  "metadata": {
    "units": "string",
    "material": "string"
  },
  "version": "string"
}
```

## CAM Operations API

### POST /api/cam/toolpath/generate
Generate toolpaths from CAD model.

**Request Body:**
```json
{
  "modelId": "string",
  "machineConfig": {
    "type": "string",
    "capabilities": ["array"]
  },
  "toolingConfig": {
    "tools": ["array"],
    "materials": ["array"]
  }
}
```

### POST /api/cam/gcode/validate
Validate generated G-code.

**Request Body:**
```json
{
  "gcode": "string",
  "machineType": "string",
  "validationRules": ["array"]
}
```

## Error Handling

All API endpoints follow this error response format:

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {}
  }
}
```

Common error codes:
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## Rate Limiting

- Free tier: 100 requests/hour
- Basic tier: 1000 requests/hour
- Pro tier: 10000 requests/hour
- Enterprise tier: Custom limits

## Authentication

All API endpoints (except /auth/login and /auth/signup) require authentication using Bearer token:

```http
Authorization: Bearer <token>
```

## Versioning

The API version is specified in the URL:
- Latest: `/api/v1/`
- Specific version: `/api/v2/`

## WebSocket API

### Connection
```javascript
const ws = new WebSocket('wss://api.cadcamfun.xyz/ws');
```

### Events
```javascript
// Real-time collaboration
ws.send(JSON.stringify({
  type: 'model.update',
  data: {
    modelId: 'string',
    changes: []
  }
}));

// Machine status updates
ws.send(JSON.stringify({
  type: 'machine.status',
  data: {
    machineId: 'string',
    status: 'string'
  }
}));
```