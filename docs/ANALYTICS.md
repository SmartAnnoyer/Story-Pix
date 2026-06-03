# Story-pix — Analytics & Reporting

## Overview

The analytics module captures platform and studio events in `scan_logs`, maintains rollups in `analytics_summaries`, and exposes dashboards, reports, and exports for Studio Admin and Super Admin roles.

## Architecture

```
Event Sources                Ingestion                     Read Path
─────────────               ─────────                     ─────────
Viewer / Albums / Media  →  AnalyticsIngestionService  →  ScanLog (append-only)
Subscriptions            →  AnalyticsSummaryService    →  AnalyticsSummary (daily/monthly $inc)
                           AnalyticsAggregationService → Dashboards / Reports (MongoDB aggregate)
                           AnalyticsExportService       → CSV / Excel download
```

Designed for scale:
- Append-only `scan_logs` with compound indexes on `studioId`, `albumId`, `eventType`, `timestamp`
- Pre-aggregated `analytics_summaries` updated on ingest for fast dashboard widgets
- Heavy date-range queries use aggregation pipelines with indexed `$match` first

## Collections

### scan_logs

Canonical event log (replaces legacy `scan_events`).

| Field | Description |
|-------|-------------|
| `studioId` | Tenant |
| `albumId` | Optional album reference |
| `arTargetId` | Optional AR target |
| `eventType` | `AnalyticsEventType` enum |
| `userAgent`, `browser`, `deviceType`, `operatingSystem` | Client metadata |
| `country`, `city` | Optional geo (future enrichment) |
| `ipHash` | SHA-256 hash of IP + salt — **no raw IPs stored** |
| `sessionId` | Viewer session for unique visitor counts |
| `timestamp` | Event time |

### analytics_summaries

Cached rollups keyed by `(scope, studioId, albumId, period, periodStart)`.

Scopes: `platform`, `studio`, `album`  
Periods: `daily`, `monthly`

## Event Types

**Album:** `album_created`, `album_published`, `album_archived`, `album_viewed`  
**AR:** `viewer_opened`, `camera_permission_granted`, `camera_permission_denied`, `scan_attempt`, `scan_success`, `scan_failed`, `video_started`, `video_completed`  
**Subscription:** `plan_assigned`, `plan_upgraded`, `plan_downgraded`, `plan_expired`  
**Media:** `photo_uploaded`, `video_uploaded`, `media_deleted`

Legacy viewer API still accepts `ScanEventType` values; they map to the unified enum internally.

## API Endpoints

### Studio (`analytics:read`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/analytics/studio/dashboard` | Widgets + charts |
| GET | `/analytics/studio/reports` | Paginated event log |
| GET | `/analytics/studio/albums/:albumId/insights` | Album metrics |
| GET | `/analytics/studio/export?format=csv\|xlsx` | Date-range export |

Query params: `from`, `to`, `albumId`, `eventType`, `page`, `limit`

### Platform (`platform:*`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/analytics/platform/dashboard` | Platform widgets + charts |
| GET | `/analytics/platform/reports` | Cross-studio report |
| GET | `/analytics/platform/studios/:studioId` | Studio-level platform view |
| GET | `/analytics/platform/export?format=csv\|xlsx` | Platform export |

## Privacy

- Raw IP addresses are never persisted
- `ipHash = SHA256(ANALYTICS_IP_SALT + ip)`
- Configure salt via `ANALYTICS_IP_SALT` env var

## Frontend Routes

| Route | Role |
|-------|------|
| `/studio/analytics` | Studio dashboard |
| `/studio/analytics/reports` | Studio reports + export |
| `/studio/albums/:id/insights` | Album insights |
| `/admin/analytics` | Platform dashboard |
| `/admin/analytics/reports` | Platform reports + export |

## Future Extensions

- GeoIP enrichment worker (populate `country`/`city` from `ipHash` lookup table)
- Redis/HyperLogLog for exact unique visitors at scale
- Revenue analytics when Razorpay is integrated
- Scheduled summary rebuild jobs for backfill
