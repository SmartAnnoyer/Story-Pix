# Story-pix — Roadmap

## Phase 1 — Foundation ✅

- [x] Monorepo scaffolding
- [x] NestJS API skeleton
- [x] React admin app skeleton
- [x] Base schemas (User, Studio, Role)
- [x] Global filters, validation, logging
- [x] ESLint, Prettier, Husky, commitlint

## Phase 2 — Authentication & Authorization ✅

- [x] Login / Logout
- [x] Refresh token rotation (httpOnly cookie)
- [x] Forgot / Reset / Change password
- [x] Get current user
- [x] RBAC guards (roles + permissions)
- [x] Account lockout
- [x] Frontend auth flow + auto refresh
- [x] Unit tests (auth service, guards)

## Phase 3 — Studio Management ✅

- [x] Super Admin studio CRUD
- [x] Suspend / activate studios
- [x] Soft delete studios
- [x] Platform dashboard
- [x] Studio Admin profile settings
- [x] Usage statistics
- [x] R2 storage interface (placeholder)
- [ ] Staff invites (Studio Staff role)

## Phase 4 — Plans & Subscriptions ✅

- [x] Plan CRUD (Super Admin)
- [x] Subscription assign / upgrade / downgrade / cancel / suspend / extend
- [x] Usage summary and limit enforcement (`LimitValidationService`)
- [x] Billing provider abstraction (Razorpay-ready)
- [x] Frontend plans & subscription pages
- [x] Studio Admin plan & usage dashboard
- [x] Razorpay payment integration

## Phase 5 — Albums & Media ✅

- [x] Album CRUD with publish/archive workflow
- [x] R2 presigned uploads (`R2StorageService` + mock fallback)
- [x] Media module (photos + videos)
- [x] Storage + per-album media limit enforcement
- [x] Album Media page (upload, galleries, progress)
- [ ] Worker-based photo/video processing (sharp/ffmpeg)
- [x] Photo–video mapping (ARTarget module)
- [ ] Worker-based photo/video processing (sharp/ffmpeg)

## Phase 6 — WebAR Viewer ✅

- [x] Public viewer route (`/viewer/:albumSlug`)
- [x] Client-side MindAR target compilation (CDN)
- [x] Public album manifest API
- [x] Studio AR mapping UI
- [x] Scan analytics (`scan_events`)
- [ ] Server-side MindAR `.mind` compilation worker
- [ ] Separate standalone viewer app (optional split)

## Phase 7 — Analytics ✅

- [x] Unified `scan_logs` event pipeline
- [x] `analytics_summaries` cached rollups
- [x] Studio analytics dashboard + reports + export
- [x] Platform analytics dashboard + reports + export
- [x] Album insights page
- [x] Event hooks (albums, media, subscriptions, viewer)
- [ ] GeoIP enrichment worker

## Phase 8 — Billing & Payments ✅

- [x] Payment and Invoice MongoDB schemas
- [x] Extended `IBillingProvider` + Razorpay provider
- [x] Order creation, payment verification, webhook handling
- [x] Studio billing APIs (subscription, payments, invoices)
- [x] Super Admin revenue dashboard + payments/invoices
- [x] Subscription automation jobs (trial/expiry/renewal/limits)
- [x] Billing notification events via analytics pipeline
- [x] Audit logging + webhook idempotency
- [x] Studio + Admin billing frontend pages
- [x] Billing documentation (`docs/BILLING.md`)
- [ ] GST / international tax calculation
- [ ] Automated refund processing
- [ ] Email notifications for billing events

## Phase 9 — Notifications & Jobs ✅

- [x] Domain event bus + notification orchestrator
- [x] BullMQ queue layer with Redis + inline fallback
- [x] Email provider abstraction (Console + Resend)
- [x] Versioned email templates with secure variable rendering
- [x] Notification, JobLog, EmailTemplate MongoDB schemas
- [x] Scheduled jobs (trial/expiry, reconciliation, analytics, storage sync)
- [x] Retry policy + dead-letter job logging
- [x] Studio notification center + admin job/notification monitoring
- [x] Event hooks (auth, studios, albums, media, billing)
- [x] Documentation (`docs/NOTIFICATIONS.md`, `docs/IMPLEMENTATION_STATUS.md`)
- [ ] SMS / WhatsApp / push channels
- [ ] Dedicated worker process split (optional)
