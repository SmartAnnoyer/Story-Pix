# Story-pix — Album Management

## Overview

Studios create and manage event albums scoped to their tenant. Albums support draft → published → archived lifecycle. Public viewer URLs are generated at creation; media, WebAR, and scan analytics attach in later phases without schema changes.

## Album Schema (`albums` collection)

| Field | Type | Notes |
|-------|------|-------|
| studioId | ObjectId | Tenant FK (required) |
| albumCode | string | Unique, e.g. `ALB-ABC123` |
| albumName | string | Display name |
| slug | string | Globally unique public identifier |
| eventType | enum | wedding, pre_wedding, reception, etc. |
| customerName | string | Client name |
| customerPhone / customerEmail | string | Optional contact |
| eventDate | Date | Event date |
| coverImage | string | URL placeholder until R2 uploads |
| description | string | Optional |
| status | enum | draft, published, archived |
| isPublished | boolean | Public access flag |
| publishedAt | Date | Set on publish |
| createdBy | ObjectId | User FK |
| deletedAt | Date | Soft delete |

### Indexes

- `studioId`, `albumName`, `customerName`, `eventType`, `status`, `slug` (unique)
- Compound: `{ studioId, deletedAt }`, `{ studioId, status }`, `{ studioId, eventDate }`
- Text: `{ albumName, customerName }`

## API Endpoints

Base: `/api/v1`

### Studio Admin (authenticated)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | `/albums` | `album:write` | Create album (subscription limit enforced) |
| GET | `/albums` | `album:read` | List with search, filters, pagination |
| GET | `/albums/recent` | `album:read` | Recent albums for dashboard widget |
| GET | `/albums/:id` | `album:read` | Album details |
| PATCH | `/albums/:id` | `album:write` | Update album |
| DELETE | `/albums/:id` | `album:write` | Soft delete (draft only) |
| POST | `/albums/:id/publish` | `album:write` | Publish album |
| POST | `/albums/:id/unpublish` | `album:write` | Unpublish to draft |
| POST | `/albums/:id/archive` | `album:write` | Archive album |

### Public (no auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/albums/public/:slug` | Published album metadata only |

## Request / Response Examples

### Create album

```http
POST /api/v1/albums
Authorization: Bearer <token>
Content-Type: application/json

{
  "albumName": "Priya & Rahul Wedding",
  "eventType": "wedding",
  "customerName": "Priya Sharma",
  "customerEmail": "priya@example.com",
  "eventDate": "2026-06-15"
}
```

```json
{
  "data": {
    "id": "...",
    "albumCode": "ALB-A1B2C3",
    "albumName": "Priya & Rahul Wedding",
    "slug": "priya-rahul-wedding-a1b2c3",
    "publicViewerUrl": "https://Story-pix.app/viewer/priya-rahul-wedding-a1b2c3",
    "status": "draft",
    "isPublished": false
  }
}
```

### List albums

```http
GET /api/v1/albums?page=1&limit=20&search=priya&status=draft&eventType=wedding&dateFrom=2026-01-01&dateTo=2026-12-31
```

### Error: plan limit exceeded

```json
{
  "error": {
    "code": "PLAN_LIMIT_EXCEEDED",
    "message": "Album limit reached for your current plan",
    "details": { "limit": 5, "used": 5 }
  }
}
```

## Usage Enforcement

Before album creation:

1. `@UseGuards(SubscriptionLimitGuard)` + `@CheckLimit(LimitType.ALBUM)`
2. `LimitValidationService.checkAlbumLimit(studioId)` validates active subscription and quota
3. On success, `UsageService.incrementAlbumCount(studioId)` runs
4. On soft delete, `UsageService.decrementAlbumCount(studioId)` runs

## Security

- All authenticated routes derive `studioId` from JWT — never from request body
- Queries always filter `{ studioId, deletedAt: null }`
- Public endpoint returns only published albums (`isPublished: true`, `status: published`)
- Published albums must be unpublished before delete

## Frontend Pages

| Route | Page |
|-------|------|
| `/studio/albums` | Albums list + archive tab |
| `/studio/albums/new` | Create album |
| `/studio/albums/:id` | Album details + publish toggle |
| `/studio/albums/:id/edit` | Edit album |

Dashboard includes **Recent Albums** widget.

## Folder Structure

```
backend/src/albums/
  albums.module.ts
  albums.service.ts
  albums.controller.ts
  schemas/album.schema.ts
  dto/album.dto.ts

frontend/src/
  types/album.types.ts
  services/album.service.ts
  hooks/useAlbumQueries.ts
  features/albums/components/
  pages/studio/Albums*.tsx
```

## Future Extensions (no schema redesign)

- **Media**: attach photos/videos via separate `media` collection referencing `albumId`
- **Photo–video mapping**: mapping collection with `albumId`, `photoId`, `videoId`
- **WebAR**: target compilation metadata on album or media documents
- **Scan analytics**: events collection with `albumId`, `studioId`
- **Public viewer**: separate app consumes `GET /albums/public/:slug` + media manifest
