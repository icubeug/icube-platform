-- 014: Add 'pending' to routers.status check constraint
-- The auto-provisioning flow (auth.routes.js) creates routers with status='pending'
-- before the router has self-registered via ZTP. The original constraint only had
-- online/offline/unreachable, which caused silent constraint violations on registration.

ALTER TABLE routers DROP CONSTRAINT IF EXISTS routers_status_check;

ALTER TABLE routers ADD CONSTRAINT routers_status_check
  CHECK (status IN ('online', 'offline', 'unreachable', 'pending'));
