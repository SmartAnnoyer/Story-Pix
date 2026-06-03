# Story-pix — Plans & Subscriptions

## Overview

Every studio must belong to a plan. Plans define usage limits; subscriptions track billing state and current usage. Enforcement happens at the backend via `LimitValidationService` and `@CheckLimit()` guard.

## Data Models

### Plan (`plans` collection)

| Field | Type | Notes |
|-------|------|-------|
| name | string | Display name |
| code | enum | `starter`, `professional`, `enterprise` (unique) |
| monthlyPrice / yearlyPrice | number | INR placeholder until Razorpay |
| maxAlbums, maxPhotosPerAlbum, maxVideosPerAlbum | number | `-1` = unlimited |
| storageLimitGB, monthlyScanLimit, maxUsers | number | `-1` = unlimited |
| features | string[] | Marketing/feature flags |
| isActive | boolean | Inactive plans cannot be assigned |

### Subscription (`subscriptions` collection)

| Field | Type | Notes |
|-------|------|-------|
| studioId | ObjectId | FK → studios |
| planId | ObjectId | FK → plans |
| status | enum | trial, active, expired, suspended, cancelled |
| billingCycle | enum | monthly, yearly |
| storageUsedGB, scanUsage, albumCount, userCount | number | Usage counters |
| startDate, endDate | Date | Billing period |
| autoRenew | boolean | |
| externalBillingId | string | Razorpay subscription ID (future) |

Studio document denormalizes `planId`, `activeSubscriptionId`, and limit fields for fast reads (synced on subscription changes).

## Default Plans (seeded on boot)

| Plan | Albums | Storage | Scans/mo | Users |
|------|--------|---------|----------|-------|
| Starter | 5 | 10 GB | 1,000 | 3 |
| Professional | 25 | 100 GB | 10,000 | 10 |
| Enterprise | Unlimited | 1 TB | Unlimited | Unlimited |

## API Endpoints

Base: `/api/v1`

### Super Admin — Plans

| Method | Path | Permission |
|--------|------|------------|
| GET | `/admin/plans` | `platform:plans:read` |
| GET | `/admin/plans/:id` | `platform:plans:read` |
| POST | `/admin/plans` | `platform:plans:write` |
| PATCH | `/admin/plans/:id` | `platform:plans:write` |
| POST | `/admin/plans/:id/activate` | `platform:plans:write` |
| POST | `/admin/plans/:id/deactivate` | `platform:plans:write` |

### Super Admin — Subscriptions

| Method | Path | Permission |
|--------|------|------------|
| GET | `/admin/subscriptions` | `platform:subscriptions:read` |
| GET | `/admin/subscriptions/:id` | `platform:subscriptions:read` |
| GET | `/admin/subscriptions/:id/usage` | `platform:subscriptions:read` |
| POST | `/admin/subscriptions/assign` | `platform:subscriptions:write` |
| POST | `/admin/subscriptions/studio/:studioId/upgrade` | `platform:subscriptions:write` |
| POST | `/admin/subscriptions/studio/:studioId/downgrade` | `platform:subscriptions:write` |
| POST | `/admin/subscriptions/:id/cancel` | `platform:subscriptions:write` |
| POST | `/admin/subscriptions/:id/suspend` | `platform:subscriptions:write` |
| POST | `/admin/subscriptions/:id/extend` | `platform:subscriptions:write` |

### Studio Admin

| Method | Path | Permission |
|--------|------|------------|
| GET | `/studio/subscription/current` | `subscription:read` |
| GET | `/studio/subscription/upgrades` | `subscription:read` |

## Usage Enforcement

### Services

- **PlanService** — CRUD, activate/deactivate, seed defaults
- **SubscriptionService** — assign, upgrade, downgrade, cancel, suspend, extend, trial provisioning
- **UsageService** — usage summary, upgrade options, increment helpers
- **LimitValidationService** — reusable limit checks

### Limit checks

```typescript
await limitValidationService.checkAlbumLimit(studioId);
await limitValidationService.checkStorageLimit(studioId, additionalGB);
await limitValidationService.checkScanLimit(studioId);
await limitValidationService.checkUserLimit(studioId);
```

### Guard decorator

```typescript
@CheckLimit(LimitType.STORAGE)
@Post('upload')
upload() { ... }
```

Throws `403 Forbidden` when limit exceeded or subscription inactive.

## Billing Abstraction (Razorpay-ready)

`IBillingProvider` interface in `backend/src/billing/`:

- `createSubscription()` — returns `externalBillingId`
- `cancelSubscription()` — void external subscription

Current implementation: **ManualBillingProvider** (no external calls). Swap to `RazorpayBillingProvider` without changing subscription logic.

## Frontend Pages

### Super Admin

- `/admin/plans` — Plans list
- `/admin/plans/new` — Create plan
- `/admin/plans/:id/edit` — Edit plan
- `/admin/plans/:id` — Plan details
- `/admin/subscriptions` — Subscription list
- `/admin/subscriptions/:id` — Subscription details + usage

### Studio Admin

- `/studio/plan` — Current plan, usage dashboard, upgrade placeholder
- Dashboard and Studio Profile embed `SubscriptionSummaryWidget`

## Folder Structure

```
backend/src/
├── plans/              schemas, dto, plans.service, plans.module
├── subscriptions/      schemas, dto, services, guards, subscriptions.module
├── billing/            IBillingProvider + ManualBillingProvider
├── admin/              admin-plans.controller, admin-subscriptions.controller
└── studio/             studio-subscription.controller

frontend/src/
├── types/subscription.types.ts
├── services/subscription.service.ts
├── hooks/useSubscriptionQueries.ts
├── features/subscriptions/components/
└── pages/admin/ + pages/studio/
```

## Tests

- `plans.service.spec.ts`
- `subscription.service.spec.ts`
- `limit-validation.service.spec.ts`
- Guard/permission tests via existing RBAC suite
