# CAD/CAM Next.js Application

This application provides a set of API endpoints for generating CAD assemblies from text descriptions.

## API Endpoints

### Generate Assembly

```
POST /api/mcp/generate-assembly
```

Creates a new CAD assembly from a text description.

**Request Body:**

```json
{
  "description": "A simple gear mechanism with 3 gears",
  "sessionId": "optional-existing-session-id",
  "constraints": {
    "maxElements": 10,
    "preferredMaterials": ["steel", "aluminum"]
  },
  "model": "claude-3-5-sonnet-20240229"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "assembly": { /* CAD assembly object */ },
    "allElements": [ /* Array of CAD elements */ ],
    "sessionId": "session-uuid"
  }
}
```

### Get Session Information

```
GET /api/mcp/session/{sessionId}
```

Retrieves information about an existing session.

**Response:**

```json
{
  "success": true,
  "data": {
    "sessionId": "session-uuid",
    "elementsCount": 12,
    "lastActivity": "2023-05-01T14:30:00.000Z",
    "context": {
      "preferredMaterials": ["steel", "aluminum"],
      "domainContext": "mechanical"
    }
  }
}
```

## Important Notes

- Session data is stored in memory and will be lost on server restart. For production, implement a database solution.
- The implementation includes custom functions for generating fasteners and base plates as needed.
- The API supports context learning to improve generation based on previous requests.

## Development

To run the development server:

```bash
npm run dev
```

Then access the API at http://localhost:3000/api/mcp/
