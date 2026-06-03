# WebAR Viewer — API & Integration Guide

## Overview

The WebAR module connects studio photo–video mappings to a public camera-based viewer. Studios manage `ARTarget` records; end users open `/viewer/:albumSlug` to scan printed photos and play mapped videos.

## Entities

### ARTarget

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `studioId` | ObjectId | Tenant scope |
| `albumId` | ObjectId | Parent album |
| `photoMediaId` | ObjectId | Ready photo media |
| `videoMediaId` | ObjectId | Ready video media |
| `targetName` | string | Display label |
| `targetIndex` | number \| null | MindAR index (assigned on publish) |
| `status` | enum | `draft`, `active`, `archived` |
| `mindFileUrl` | string \| null | Reserved for server-side compilation |
| `createdAt` / `updatedAt` | Date | Timestamps |

**Indexes:** `albumId`, `studioId`, `status`, unique photo/video per album (draft + active).

### ScanEvent

Analytics log for viewer interactions.

| Field | Type |
|-------|------|
| `studioId`, `albumId`, `albumSlug` | identifiers |
| `arTargetId` | optional mapping reference |
| `eventType` | `viewer_open`, `scan_success`, `scan_failed`, `video_play` |
| `deviceType`, `browser`, `userAgent` | client metadata |
| `targetIndex` | optional MindAR index |
| `metadata` | optional JSON |
| `createdAt` | timestamp |

## Studio APIs (authenticated)

Base path: `/api/v1`

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/ar-targets` | `ar:read` | List mappings (filter by `albumId`, `status`) |
| GET | `/ar-targets/:id` | `ar:read` | Get mapping |
| POST | `/ar-targets` | `ar:write` | Create draft mapping |
| PATCH | `/ar-targets/:id` | `ar:write` | Update draft mapping |
| DELETE | `/ar-targets/:id` | `ar:write` | Delete draft mapping |
| POST | `/ar-targets/:id/publish` | `ar:write` | Publish mapping (assigns `targetIndex`) |
| POST | `/ar-targets/:id/archive` | `ar:write` | Archive mapping |
| GET | `/albums/:albumId/ar-targets` | `ar:read` | Album-scoped list |

### Create body

```json
{
  "albumId": "507f1f77bcf86cd799439013",
  "photoMediaId": "507f1f77bcf86cd799439014",
  "videoMediaId": "507f1f77bcf86cd799439015",
  "targetName": "First Dance"
}
```

### Validation

- Photo and video must belong to the album and studio
- Both media items must be `ready`
- One photo → max one active/draft mapping per album
- One video → max one active/draft mapping per album
- Only draft mappings can be edited or deleted
- Active mappings must be archived before editing

## Public Viewer APIs (no auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/viewer/public/:albumSlug/manifest` | Published album + active targets |
| POST | `/viewer/public/:albumSlug/events` | Record analytics event |

### Manifest response

```json
{
  "album": {
    "id": "...",
    "albumName": "Priya & Arjun",
    "slug": "priya-arjun-abc123",
    "coverImage": null,
    "description": null
  },
  "targets": [
    {
      "id": "...",
      "targetName": "Ceremony",
      "targetIndex": 0,
      "photoUrl": "https://...",
      "videoUrl": "https://...",
      "videoAvailable": true
    }
  ],
  "branding": {
    "studioName": "Sunrise Studio",
    "logoUrl": null
  }
}
```

### Event body

```json
{
  "eventType": "scan_success",
  "arTargetId": "...",
  "targetIndex": 0,
  "deviceType": "mobile",
  "browser": "Chrome/120.0",
  "userAgent": "Mozilla/5.0 ..."
}
```

`scan_success` increments subscription scan usage after limit check.

## Frontend Routes

| Route | Audience | Purpose |
|-------|----------|---------|
| `/studio/albums/:id/ar-mappings` | Studio Admin | List mappings |
| `/studio/albums/:id/ar-mappings/new` | Studio Admin | Create mapping |
| `/studio/albums/:id/ar-mappings/:mappingId/edit` | Studio Admin | Edit draft |
| `/viewer/:albumSlug` | Public | WebAR viewer |

## MindAR Integration

- MindAR + A-Frame loaded via CDN (avoids native `canvas` build on Windows)
- Target `.mind` file compiled in-browser from published photo URLs
- Compiled buffer cached in `sessionStorage` per album/target set
- `targetIndex` from backend maps to `mindar-image-target` entities

## Fallback Messages

| Condition | Message |
|-----------|---------|
| Target not recognized (12s timeout) | Move camera closer |
| Video missing | Video unavailable |
| Camera denied / AR error | Camera access required |

## Future Extensions (no redesign required)

- **NFC / QR launch:** deep-link to `/viewer/:albumSlug?target=0`
- **Server-side MindAR compile:** populate `mindFileUrl` on publish
- **White-label:** extend manifest `branding` block
- **AI enhancement:** pre-process photo URLs before compile
