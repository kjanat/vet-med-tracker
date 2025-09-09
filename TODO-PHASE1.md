# Phase 1 Simplification - Fix Import Dependencies

## Step 3: Update Components to Remove Dependencies

### High Priority (Breaking Imports)
- [ ] app/(main)/(authed)/(main)/admin/record/page.tsx - Remove useOfflineQueue
- [ ] app/(main)/(authed)/(main)/dashboard/history/page.tsx - Remove useOfflineQueue  
- [ ] app/(main)/(authed)/(main)/medications/inventory/page.tsx - Remove useOfflineQueue
- [ ] components/history/history-list.tsx - Remove useOfflineQueue
- [ ] components/ui/photo-uploader/index.tsx - Remove usePhotoUpload
- [ ] components/layout/global-layout.tsx - Remove OfflineBanner
- [ ] components/layout/header.tsx - Remove SyncStatus
- [ ] components/providers/app-provider-consolidated.tsx - Remove offline db
- [ ] components/providers/app-provider.tsx - Remove offline db

### API Routes (Infrastructure Dependencies)  
- [ ] app/api/breaker-status/route.ts - Remove circuit-breaker import
- [ ] app/api/health/route.ts - Remove health checks import
- [ ] server/api/trpc.ts - Remove infrastructure middleware

### Error Handling
- [ ] components/error-boundary.tsx - Remove error-reporting import

### Debug Pages
- [ ] app/(main)/(authed)/(standalone)/debug-sync/page.tsx - Remove sync-status

### Test Files (Remove or Update)
- [ ] tests/integration/health-endpoint.test.ts - Remove entire file
- [ ] tests/unit/hooks/usePhotoUpload.test.ts - Remove entire file
- [ ] lib/logging/integration-example.ts - Remove infrastructure imports

## Current Progress
✅ Removed lib/offline/, hooks/offline/ (-42 files, -17,085 lines)
✅ Removed lib/redis/, lib/infrastructure/ 
🔄 Fixing import dependencies

## Target: ~20 files, ~16,000+ lines removed