# Story-pix — Project Context

## Product

Story-pix is a multi-tenant SaaS platform for wedding studios and photographers. Studios upload photos and videos, link them, and publish interactive WebAR albums. End users scan printed photos with their phone camera to play associated videos.

## Current Phase

**Phase 9 — Notifications, Email & Background Jobs** ✅ Complete

Event-driven notification architecture with BullMQ job queues, Resend-ready email provider abstraction, in-app notification center, and scheduled billing/analytics jobs migrated from in-process cron.

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | React 19, Vite, TypeScript, Ant Design, Tailwind, React Query, Zustand, MindAR (CDN), A-Frame (CDN), Razorpay Checkout (CDN) |
| Backend | NestJS, MongoDB, Mongoose, JWT, Refresh Tokens, BullMQ, @nestjs/schedule |
| Queue | BullMQ + Redis (inline fallback when `REDIS_URL` unset) |
| Email | Resend via `IEmailProvider` (console provider for dev) |
| Storage | Cloudflare R2 (S3-compatible API via `@aws-sdk/client-s3`) |
| Payments | Razorpay (via `IBillingProvider` abstraction; manual provider for dev) |

## Architecture Principles

- **Modular monolith** — single NestJS API with BullMQ workers (inline when Redis unavailable)
- **Event-driven notifications** — domain events → orchestrator → in-app + email channels
- **Shared DB multi-tenancy** — all tenant data scoped by `studioId`
- **Provider abstractions** — billing (`IBillingProvider`), email (`IEmailProvider`), storage (`IStorageService`)
- **Append-only analytics** — `scan_logs` + `analytics_summaries`; billing/notification events also tracked
- **Job observability** — `job_logs` collection + admin monitoring dashboards

## MVP Roles

| Role | Scope |
|------|-------|
| Super Admin | Platform-wide access including jobs, notifications, billing, analytics |
| Studio Admin | Own studio resources including billing, notifications, AR, analytics |
| Studio Staff | `notifications:read/write`, `ar:*`, `analytics:read` pre-wired |

## Environment

- Backend: `http://localhost:3000/api/v1`
- Frontend: `http://localhost:5173`
- MongoDB: `MONGODB_URI`
- Redis: `REDIS_URL` (optional — jobs run inline without it)
- Email: `EMAIL_PROVIDER=console` or `resend`
- Billing: `BILLING_PROVIDER=manual` or `razorpay`

## Out of Scope (Current Phase)

- SMS / WhatsApp / push notification channels (architecture ready)
- Worker-based sharp/ffmpeg media processing
- Server-side MindAR `.mind` compilation worker
- GeoIP enrichment pipeline
- GST / international tax calculation
