# Story-pix — Studio Management API

Base URL: `http://localhost:3000/api/v1`

## Super Admin Endpoints

All require `Authorization: Bearer <token>` and `super_admin` role.

### Dashboard

```http
GET /admin/dashboard
```

**Response**
```json
{
  "data": {
    "totalStudios": 12,
    "activeStudios": 8,
    "suspendedStudios": 1,
    "trialStudios": 3,
    "expiredStudios": 0,
    "totalStorageUsedGB": 45.5,
    "totalMonthlyScans": 12800,
    "revenuePlaceholder": 0,
    "subscriptionSummary": {
      "trial": 3,
      "active": 8,
      "expired": 0,
      "suspended": 1
    }
  }
}
```

### List Studios

```http
GET /admin/studios?page=1&limit=20&search=sunrise&status=trial
```

**Response**
```json
{
  "data": {
    "items": [{ "id": "...", "studioCode": "STU-ABC123", "studioName": "Sunrise Studio", "status": "trial" }],
    "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1, "hasMore": false }
  }
}
```

### Create Studio

```http
POST /admin/studios
Content-Type: application/json

{
  "studioName": "Sunrise Photography",
  "ownerName": "Jane Doe",
  "email": "studio@sunrise.com",
  "phone": "+919876543210",
  "address": "123 Main St, Mumbai",
  "website": "https://sunrise.com",
  "adminEmail": "admin@sunrise.com",
  "adminFirstName": "Jane",
  "adminLastName": "Doe"
}
```

**Response**
```json
{
  "data": {
    "studio": { "id": "...", "studioCode": "STU-A1B2C3", "status": "trial" },
    "admin": { "email": "admin@sunrise.com", "temporaryPassword": "Aa1!xY9zK2mN" }
  }
}
```

Auto setup: trial plan assigned, Studio Admin created, welcome email logged (dev).

### Update Studio

```http
PATCH /admin/studios/:id
```

### Suspend / Activate / Delete

```http
POST /admin/studios/:id/suspend
POST /admin/studios/:id/activate
DELETE /admin/studios/:id
```

Delete is a **soft delete** (`deletedAt` set).

## Studio Admin Endpoints

Require `studio_admin` role.

### Get Profile

```http
GET /studio/profile
```

### Update Profile

```http
PATCH /studio/profile
```

### Usage Statistics

```http
GET /studio/usage
```

### Logo Upload (R2 placeholder)

```http
POST /studio/profile/logo/presign
{ "contentType": "image/png", "fileName": "logo.png" }
```

```http
PATCH /studio/profile/logo
{ "logoUrl": "https://media.Story-pix.app/tenants/.../logo.png" }
```

## Error Responses

```json
{
  "data": null,
  "meta": { "timestamp": "2026-05-30T12:00:00.000Z" },
  "error": {
    "code": "HTTP_EXCEPTION",
    "message": "Cross-tenant access denied"
  }
}
```

| Status | Scenario |
|--------|----------|
| 401 | Missing or invalid token |
| 403 | Insufficient role or tenant isolation violation |
| 404 | Studio not found |
| 409 | Duplicate email or studio code conflict |
