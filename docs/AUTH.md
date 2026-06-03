# Story-pix — Authentication & Authorization

## Overview

Production-ready auth for Super Admin and Studio Admin roles. Refresh tokens are stored in an httpOnly cookie; access tokens are short-lived JWTs sent via `Authorization: Bearer`.

## API Endpoints

Base URL: `http://localhost:3000/api/v1`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/login` | Public | Sign in |
| POST | `/auth/refresh` | Public | Rotate tokens (cookie-based) |
| POST | `/auth/logout` | JWT | Revoke refresh token |
| POST | `/auth/forgot-password` | Public | Request password reset |
| POST | `/auth/reset-password` | Public | Reset password with token |
| POST | `/auth/change-password` | JWT | Change password |
| GET | `/auth/me` | JWT | Get current user |

## Request / Response Examples

### Login

**Request**
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@Story-pix.app",
  "password": "Admin@123456"
}
```

**Response**
```json
{
  "data": {
    "user": {
      "id": "665f1c...",
      "email": "admin@Story-pix.app",
      "firstName": "Super",
      "lastName": "Admin",
      "role": "super_admin",
      "status": "active",
      "studioId": null,
      "lastLoginAt": "2026-05-30T12:00:00.000Z",
      "createdAt": "2026-05-30T10:00:00.000Z",
      "updatedAt": "2026-05-30T12:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  },
  "meta": { "timestamp": "2026-05-30T12:00:00.000Z" },
  "error": null
}
```

**Set-Cookie:** `Story-pix_refresh_token=...; HttpOnly; SameSite=Lax; Path=/`

### Refresh

**Request**
```http
POST /api/v1/auth/refresh
Cookie: Story-pix_refresh_token=...
```

**Response**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  },
  "meta": { "timestamp": "2026-05-30T12:15:00.000Z" },
  "error": null
}
```

### Get Current User

**Request**
```http
GET /api/v1/auth/me
Authorization: Bearer <accessToken>
```

### Change Password

**Request**
```http
POST /api/v1/auth/change-password
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "currentPassword": "Admin@123456",
  "newPassword": "NewAdmin@123456"
}
```

## Roles & Permissions

| Role | Scope | Permissions |
|------|-------|-------------|
| `super_admin` | Platform-wide | `platform:*` |
| `studio_admin` | Own studio | `studio:*`, `album:*`, `media:*` |
| `studio_staff` | Future | Not implemented |

### Guards

| Guard | Purpose |
|-------|---------|
| `JwtAuthGuard` | Validates access JWT |
| `RolesGuard` | Checks `@Roles()` — Super Admin bypasses |
| `PermissionsGuard` | Checks `@RequirePermissions()` |
| `TenantGuard` | Enforces `@TenantScoped()` studio isolation |

## Security

- **bcrypt** (12 rounds) for passwords and refresh token hashes
- **Refresh token rotation** with reuse detection
- **Account lockout** after 5 failed attempts (15 min)
- **Password policy:** 8+ chars, upper, lower, number, special
- **Rate limiting** on auth endpoints
- **httpOnly cookie** for refresh token
- **Access token** in sessionStorage (short-lived)

## Default Super Admin (Dev)

Seeded on first boot from env:

```
SUPER_ADMIN_EMAIL=admin@Story-pix.app
SUPER_ADMIN_PASSWORD=Admin@123456
```

Change immediately after first login in production.

## Password Reset (Dev)

Reset links are logged to the backend console until email service is integrated.

## Frontend Auth Flow

1. App bootstraps session via `/auth/me` or `/auth/refresh`
2. Access token stored in sessionStorage
3. Axios interceptor auto-refreshes on 401
4. Logout clears cookie (server) and sessionStorage (client)

## Folder Changes

### Backend
```
src/auth/token.service.ts
src/auth/auth.service.spec.ts
src/common/constants/permissions.constants.ts
src/common/validators/password.validator.ts
src/config/auth.config.ts
src/guards/permissions.guard.ts
src/guards/tenant.guard.ts
src/guards/*.spec.ts
```

### Frontend
```
src/components/GuestRoute.tsx
src/features/auth/schemas/auth.schemas.ts
src/hooks/useAuthQueries.ts
src/pages/ChangePasswordPage.tsx
```
