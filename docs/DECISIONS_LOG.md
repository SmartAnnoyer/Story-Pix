# Story-pix — Decisions Log

## ADR-001: Monorepo with npm Workspaces

**Status:** Accepted  
**Decision:** Single repo with `frontend/` and `backend/` workspaces.  
**Rationale:** Simplifies local dev, shared release cadence, Husky/commitlint at root.

---

## ADR-002: Shared Database Multi-Tenancy

**Status:** Accepted  
**Decision:** One MongoDB database; tenant isolation via mandatory `studioId` on queries.  
**Rationale:** Cost-effective for thousands of studios; Super Admin bypasses tenant scope.

---

## ADR-003: JWT Access + httpOnly Refresh Cookie

**Status:** Accepted  
**Decision:** Short-lived JWT access token (15m) in `Authorization` header; refresh token (7d) in httpOnly Secure cookie.  
**Rationale:** Mitigates XSS token theft; refresh rotation stored server-side as bcrypt hash.

---

## ADR-004: Refresh Token Rotation

**Status:** Accepted  
**Decision:** Each refresh issues new access + refresh tokens; old refresh hash invalidated. Hash mismatch after valid JWT triggers session revocation (reuse detection).  
**Rationale:** Industry best practice for stolen refresh token mitigation.

---

## ADR-005: Account Lockout

**Status:** Accepted  
**Decision:** Lock account for 15 minutes after 5 failed login attempts.  
**Rationale:** Brute-force protection without permanent lockout.

---

## ADR-006: Password Policy

**Status:** Accepted  
**Decision:** Minimum 8 characters; must include uppercase, lowercase, number, and special character.  
**Rationale:** Balance usability and security for MVP.

---

## ADR-007: MVP Roles

**Status:** Accepted  
**Decision:** Implement Super Admin and Studio Admin only. Studio Staff enum reserved for future.  
**Rationale:** Reduce MVP scope; schema and guards designed for extension.

---

## ADR-008: Password Reset (Dev Mode)

**Status:** Accepted  
**Decision:** Reset tokens stored hashed in DB; reset URL logged to console in development until email service is added.  
**Rationale:** Unblocks auth flow without email infrastructure.

---

## ADR-010: Mock Storage Service for R2

**Status:** Accepted  
**Decision:** Introduce `IStorageService` abstraction with `MockStorageService` until Cloudflare R2 credentials are configured.  
**Rationale:** Enables logo upload flow and presigned URL architecture without blocking studio management.

---

## ADR-011: Auto Studio Provisioning

**Status:** Accepted  
**Decision:** Creating a studio atomically provisions: studio record (trial status), Studio Admin account, temporary password, and trial quotas.  
**Rationale:** Reduces onboarding steps for Super Admin; welcome email logged until email service exists.

---

## ADR-012: Studio Status Model

**Status:** Accepted  
**Decision:** Studio `status` (active, suspended, trial, expired) is separate from `subscriptionStatus` (trial, active, expired, cancelled).  
**Rationale:** Supports operational suspension independent of billing state.

---

## ADR-013: Billing Provider Abstraction

**Status:** Accepted  
**Decision:** Introduce `IBillingProvider` with `ManualBillingProvider` for MVP; subscriptions store `externalBillingId` for future Razorpay linkage.  
**Rationale:** Enables plan/subscription logic without payment gateway; swap provider without refactoring services.

---

## ADR-014: Plan/Subscription as Source of Truth

**Status:** Accepted  
**Decision:** Plans define limits; active subscriptions track usage counters. Studio document denormalizes `planId`, `activeSubscriptionId`, and limit fields synced on subscription changes.  
**Rationale:** Fast tenant reads while keeping authoritative billing state in subscriptions collection.

---

## ADR-015: Unlimited Limits Convention

**Status:** Accepted  
**Decision:** Numeric limit value `-1` means unlimited for albums, scans, users, etc.  
**Rationale:** Simple MongoDB schema; `LimitValidationService` skips checks when limit is `-1`.

---

## ADR-016: Album Slug as Public Identifier

**Status:** Accepted  
**Decision:** Each album gets a globally unique `slug` at creation; public viewer URL is `{VIEWER_BASE_URL}/{slug}`. Public API exposes metadata only for `status=published` and `isPublished=true`.  
**Rationale:** Decouples public viewer from internal IDs; media and WebAR layers can attach via `albumId` without changing the public URL contract.

---

## ADR-017: R2 Storage Provider with Mock Fallback

**Status:** Accepted  
**Decision:** Extend `IStorageService` with `R2StorageService` (AWS S3 SDK) when R2 credentials are configured; otherwise use `MockStorageService`. Provider selected at boot via `storage.useR2` config flag.  
**Rationale:** Enables local dev without R2 credentials while production uses direct-to-R2 presigned uploads.

---

## ADR-018: Presigned Upload Flow for Media

**Status:** Accepted  
**Decision:** Media uploads use a three-step flow: (1) `POST /media/upload` creates metadata + presigned URL after limit checks, (2) client PUTs to R2, (3) `POST /media/:id/confirm` verifies object and runs processing. Storage usage incremented only on confirm.  
**Rationale:** Avoids streaming large files through API; aligns with R2 best practices; accurate billing on confirmed bytes.

---

## ADR-019: In-Process Media Processing Placeholder

**Status:** Accepted  
**Decision:** `MediaProcessingService` implements `IMediaProcessor` in-process for MVP (thumbnail key paths, dimension/duration hints). Worker queue can replace processing without schema changes — jobs reference `mediaId`.  
**Rationale:** Unblocks upload UX while worker infrastructure is planned; stable `mediaId` is the integration point for WebAR and mapping.

---

## ADR-020: ARTarget Entity for Photo–Video Mapping

**Status:** Accepted  
**Decision:** Introduce `ARTarget` collection linking one ready photo media item to one ready video media item per album. Status workflow: `draft` → `active` (publish) → `archived`. Enforce uniqueness: one photo and one video may each appear in at most one non-archived mapping per album.  
**Rationale:** Stable mapping layer for WebAR, analytics, and future NFC/QR launchers without coupling to MindAR internals.

---

## ADR-021: Public Viewer Manifest + Scan Analytics

**Status:** Accepted  
**Decision:** Public routes `GET /viewer/public/:albumSlug/manifest` and `POST /viewer/public/:albumSlug/events` are unauthenticated (`@Public()`). Manifest returns only published albums with `active` targets. `scan_success` events enforce subscription scan limits and increment usage. Events stored in `scan_events` with device/browser metadata.  
**Rationale:** End-user viewer must work without login; scan billing tied to successful recognitions; analytics pipeline extensible for platform dashboards.

---

## ADR-022: Client-Side MindAR Target Compilation (MVP)

**Status:** Accepted  
**Decision:** MindAR + A-Frame loaded via CDN in the viewer. `.mind` target files compiled in-browser from published photo URLs on first load; buffer cached in `sessionStorage`. Backend assigns sequential `targetIndex` on publish; optional `mindFileUrl` reserved for future server-side worker.  
**Rationale:** Avoids native `canvas` npm dependency (Windows build failures); unblocks MVP while worker-based compilation is planned.

---

## ADR-023: Unified ScanLog Analytics Pipeline

**Status:** Accepted  
**Decision:** Replace legacy `scan_events` with append-only `scan_logs` collection and unified `AnalyticsEventType` enum covering album, AR, subscription, and media events. Ingestion via `AnalyticsIngestionService`; rollups in `analytics_summaries` updated on write; dashboards via `AnalyticsAggregationService` aggregation pipelines.  
**Rationale:** Supports millions of events with indexed queries and cached summaries; single pipeline for viewer and backend-generated events.

---

## ADR-024: Privacy-Safe IP Handling for Analytics

**Status:** Accepted  
**Decision:** Never store raw IP addresses. Persist `ipHash = SHA256(ANALYTICS_IP_SALT + ip)` only. Session-based unique visitor counts use client-generated `sessionId` in viewer.  
**Rationale:** GDPR-friendly analytics defaults; salt rotation supported via env config.

---

## ADR-025: Razorpay Billing Provider

**Status:** Accepted  
**Decision:** Extend `IBillingProvider` with order creation, payment/webhook signature verification, and implement `RazorpayBillingProvider`. Keep `ManualBillingProvider` as default for local dev. Select provider via `BILLING_PROVIDER` env flag.  
**Rationale:** Enables production payments while preserving ADR-013 abstraction for future Stripe/PayPal providers.

---

## ADR-026: Payment and Invoice Collections

**Status:** Accepted  
**Decision:** Introduce `payments` and `invoices` MongoDB collections with indexed `studioId`, `subscriptionId`, `status`, and `transactionDate`. Invoice schema includes `taxAmount` reserved for future GST/international taxes (zero for MVP).  
**Rationale:** Separates financial records from subscription state; supports audit, revenue reporting, and future tax compliance.

---

## ADR-027: Billing Webhook Idempotency and Audit

**Status:** Accepted  
**Decision:** Store processed Razorpay webhook events in `billing_webhook_events` with unique `eventId`. Log all billing actions to `billing_audit_logs`. Verify webhook signatures with `RAZORPAY_WEBHOOK_SECRET`.  
**Rationale:** Prevents duplicate payment processing; supports compliance and debugging.

---

## ADR-028: In-Process Billing Automation Jobs

**Status:** Superseded by ADR-029  
**Decision:** Use `@nestjs/schedule` cron jobs for trial expiry, subscription expiry, usage limit enforcement, and renewal reminders. Emit billing lifecycle events via existing `AnalyticsIngestionService`.  
**Rationale:** Unblocks subscription automation without worker infrastructure; jobs can migrate to worker queue later.

---

## ADR-029: Event-Driven Notifications with BullMQ

**Status:** Accepted  
**Decision:** Introduce `EventBusService` + `NotificationOrchestratorService` for domain events. Process emails and notification delivery via BullMQ queues (`Story-pix-email`, `Story-pix-notifications`, `Story-pix-scheduled`). Persist notifications, job logs, and versioned email templates in MongoDB. Fall back to inline job execution when `REDIS_URL` is unset.  
**Rationale:** Decouples domain logic from delivery; supports retries, dead-letter tracking, and future channels (SMS, push) without redesign.

---

## ADR-030: Email Provider Abstraction

**Status:** Accepted  
**Decision:** Introduce `IEmailProvider` with `ConsoleEmailProvider` (dev) and `ResendEmailProvider` (production). Email templates stored in `email_templates` with HTML/text bodies, allowlisted variables, and versioning.  
**Rationale:** Mirrors billing provider pattern (ADR-013); enables SendGrid/SES/Postmark swap without service refactors.

---

## ADR-031: Notification Collection and Tenant Isolation

**Status:** Accepted  
**Decision:** Store in-app and email notification records in `notifications` collection scoped by `studioId` + `userId`. Studio APIs enforce tenant context; Super Admin monitoring bypasses tenant scope via platform permissions.  
**Rationale:** Supports notification center UX while preserving multi-tenant isolation.

---

## ADR-009: Super Admin Seed

**Status:** Accepted  
**Decision:** Bootstrap Super Admin from env vars (`SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`) on app startup if none exists.  
**Rationale:** Enables first login in fresh environments.
