# Phase 3: Performance & PWA Enhancement

**Duration**: Week 3  
**Priority**: HIGH  
**Dependencies**: Phase 1 & 2 Complete

## Overview

This phase focuses on optimizing application performance, enhancing PWA capabilities, and ensuring reliable offline functionality. The goal is to achieve near-native performance and complete offline support for critical features.

## Core Objectives

- Achieve Core Web Vitals targets
- Optimize bundle sizes and load times
- Enhance service worker capabilities
- Implement push notifications
- Perfect offline synchronization

---

## 3.1 Performance Optimization

**Priority**: HIGH  
**Time Estimate**: 10 hours  
**Assignee**: Senior Full-Stack Developer

### Objectives
- Reduce bundle size by 40%
- Achieve sub-3s Time to Interactive
- Optimize React rendering performance
- Implement strategic code splitting

### Tasks

#### Bundle Optimization (4 hours)

**Current State Analysis**:
```bash
# Run bundle analysis
pnpm build
pnpm analyze
```

**Optimization Strategies**:

1. **Route-Based Code Splitting**
   ```typescript
   // app/(authed)/insights/page.tsx
   import dynamic from 'next/dynamic';
   
   const InsightsCharts = dynamic(
     () => import('@/components/insights/charts'),
     {
       loading: () => <ChartSkeleton />,
       ssr: false // Charts don't need SSR
     }
   );
   ```

2. **Component Lazy Loading**
   ```typescript
   // Lazy load heavy components
   const BarcodeScanner = lazy(() => 
     import('@/components/inventory/barcode-scanner')
   );
   
   const RichTextEditor = lazy(() => 
     import('@/components/ui/rich-text-editor')
   );
   
   const DataExporter = lazy(() => 
     import('@/components/insights/data-exporter')
   );
   ```

3. **Library Optimization**
   ```typescript
   // Replace heavy libraries with lighter alternatives
   // Before: date-fns (full import)
   import { format, parseISO } from 'date-fns';
   
   // After: date-fns with tree shaking
   import format from 'date-fns/format';
   import parseISO from 'date-fns/parseISO';
   ```

4. **Dynamic Imports for Features**
   ```typescript
   // Load features on demand
   const loadBarcodeScanner = async () => {
     const { BarcodeScanner } = await import('@/features/barcode');
     return BarcodeScanner;
   };
   ```

#### Image Optimization (2 hours)

**Implementation Steps**:

1. **Next.js Image Component**
   ```tsx
   // components/ui/animal-avatar.tsx
   import Image from 'next/image';
   
   <Image
     src={animal.photoUrl}
     alt={`${animal.name} avatar`}
     width={48}
     height={48}
     loading="lazy"
     placeholder="blur"
     blurDataURL={generateBlurPlaceholder()}
   />
   ```

2. **Responsive Images**
   ```tsx
   // Generate responsive image sizes
   <Image
     sizes="(max-width: 640px) 48px,
            (max-width: 1024px) 64px,
            96px"
     quality={85}
   />
   ```

3. **WebP Format Support**
   ```typescript
   // next.config.mjs
   images: {
     formats: ['image/avif', 'image/webp'],
     deviceSizes: [640, 750, 828, 1080, 1200],
     imageSizes: [16, 32, 48, 64, 96, 128, 256]
   }
   ```

#### React Optimization (3 hours)

**Memoization Strategy**:

1. **Component Memoization**
   ```typescript
   // components/inventory/inventory-card.tsx
   export const InventoryCard = memo(({ item, onEdit, onAssign }) => {
     // Component implementation
   }, (prevProps, nextProps) => {
     // Custom comparison for better performance
     return prevProps.item.id === nextProps.item.id &&
            prevProps.item.updatedAt === nextProps.item.updatedAt;
   });
   ```

2. **Hook Optimization**
   ```typescript
   // hooks/useInventoryCalculations.ts
   export const useInventoryCalculations = (items: InventoryItem[]) => {
     const totalValue = useMemo(() => 
       items.reduce((sum, item) => sum + (item.cost * item.quantity), 0),
       [items]
     );
     
     const expiringItems = useMemo(() =>
       items.filter(item => isExpiringSoon(item.expiryDate)),
       [items]
     );
     
     return { totalValue, expiringItems };
   };
   ```

3. **Callback Optimization**
   ```typescript
   // components/admin/record-form.tsx
   const handleSubmit = useCallback(async (data: FormData) => {
     await recordMedication(data);
   }, [recordMedication]);
   
   const handleInventoryChange = useCallback((itemId: string) => {
     setSelectedInventory(itemId);
   }, []);
   ```

#### Database Query Optimization (1 hour)

**Query Improvements**:

1. **Batch Loading**
   ```typescript
   // server/api/routers/animals.ts
   const getAnimalsWithRegimens = protectedProcedure
     .query(async ({ ctx }) => {
       // Use a single query with joins instead of N+1
       return await ctx.db
         .select()
         .from(animals)
         .leftJoin(regimens, eq(animals.id, regimens.animalId))
         .where(eq(animals.householdId, ctx.session.householdId));
     });
   ```

2. **Pagination Implementation**
   ```typescript
   // Implement cursor-based pagination
   const paginatedHistory = protectedProcedure
     .input(z.object({
       cursor: z.string().optional(),
       limit: z.number().min(1).max(100).default(20)
     }))
     .query(async ({ ctx, input }) => {
       // Efficient pagination query
     });
   ```

---

## 3.2 Service Worker Enhancement

**Priority**: HIGH  
**Time Estimate**: 8 hours  
**Assignee**: Full-Stack Developer

### Objectives
- Implement intelligent caching strategies
- Perfect background sync
- Add push notification support
- Handle offline conflicts gracefully

### Tasks

#### Caching Strategy Optimization (3 hours)

**Enhanced Service Worker**:

```javascript
// public/sw.js
const CACHE_VERSION = 'v2';
const CACHE_NAMES = {
  STATIC: `static-${CACHE_VERSION}`,
  DYNAMIC: `dynamic-${CACHE_VERSION}`,
  API: `api-${CACHE_VERSION}`,
  IMAGES: `images-${CACHE_VERSION}`
};

// Implement cache strategies
const cacheStrategies = {
  // Network first, fallback to cache (for API calls)
  networkFirst: async (request) => {
    try {
      const response = await fetch(request);
      const cache = await caches.open(CACHE_NAMES.API);
      cache.put(request, response.clone());
      return response;
    } catch (error) {
      return caches.match(request);
    }
  },
  
  // Cache first, network fallback (for static assets)
  cacheFirst: async (request) => {
    const cached = await caches.match(request);
    if (cached) return cached;
    
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAMES.STATIC);
    cache.put(request, response.clone());
    return response;
  },
  
  // Stale while revalidate (for images)
  staleWhileRevalidate: async (request) => {
    const cached = await caches.match(request);
    const fetchPromise = fetch(request).then(response => {
      const cache = caches.open(CACHE_NAMES.IMAGES);
      cache.then(c => c.put(request, response.clone()));
      return response;
    });
    
    return cached || fetchPromise;
  }
};
```

#### Background Sync Improvement (3 hours)

**Robust Sync Implementation**:

```javascript
// public/sw.js - Background sync
self.addEventListener('sync', async (event) => {
  if (event.tag === 'sync-queue') {
    event.waitUntil(syncOfflineQueue());
  }
});

async function syncOfflineQueue() {
  const queue = await getQueuedRequests();
  
  for (const request of queue) {
    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body
      });
      
      if (response.ok) {
        await removeFromQueue(request.id);
        await notifySync('success', request);
      } else if (response.status === 409) {
        // Handle conflicts
        await handleConflict(request, response);
      }
    } catch (error) {
      // Retry with exponential backoff
      await scheduleRetry(request);
    }
  }
}

// Conflict resolution
async function handleConflict(request, response) {
  const conflict = await response.json();
  
  // Notify user of conflict
  self.registration.showNotification('Sync Conflict', {
    body: `Conflict detected for ${conflict.resource}`,
    actions: [
      { action: 'keep-local', title: 'Keep Local' },
      { action: 'keep-remote', title: 'Keep Remote' }
    ],
    data: { request, conflict }
  });
}
```

#### Push Notifications (2 hours)

**Implementation Steps**:

1. **Service Worker Registration**
   ```typescript
   // lib/push-notifications.ts
   export async function registerPushNotifications() {
     const registration = await navigator.serviceWorker.ready;
     
     const subscription = await registration.pushManager.subscribe({
       userVisibleOnly: true,
       applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
     });
     
     // Send subscription to server
     await fetch('/api/notifications/subscribe', {
       method: 'POST',
       body: JSON.stringify(subscription),
       headers: {
         'Content-Type': 'application/json'
       }
     });
   }
   ```

2. **Notification Handling**
   ```javascript
   // public/sw.js
   self.addEventListener('push', (event) => {
     const data = event.data.json();
     
     const options = {
       body: data.body,
       icon: '/icon-192x192.png',
       badge: '/badge-72x72.png',
       vibrate: [200, 100, 200],
       data: data.metadata,
       actions: data.actions || []
     };
     
     event.waitUntil(
       self.registration.showNotification(data.title, options)
     );
   });
   
   // Handle notification clicks
   self.addEventListener('notificationclick', (event) => {
     event.notification.close();
     
     if (event.action === 'record') {
       clients.openWindow('/admin/record');
     } else if (event.action === 'snooze') {
       // Snooze logic
     }
   });
   ```

---

## 3.3 PWA Manifest Enhancement

**Priority**: MEDIUM  
**Time Estimate**: 4 hours  
**Assignee**: Frontend Developer

### Tasks

#### App Manifest Optimization (2 hours)

**Enhanced manifest.json**:
```json
{
  "name": "VetMed Tracker",
  "short_name": "VetMed",
  "description": "Track veterinary medications for your pets",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0ea5e9",
  "orientation": "portrait",
  "categories": ["medical", "productivity"],
  "screenshots": [
    {
      "src": "/screenshots/mobile-1.png",
      "sizes": "1080x1920",
      "type": "image/png",
      "platform": "narrow",
      "label": "Record medications easily"
    }
  ],
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "Record Medication",
      "short_name": "Record",
      "description": "Quick medication recording",
      "url": "/admin/record",
      "icons": [{ "src": "/shortcuts/record.png", "sizes": "96x96" }]
    },
    {
      "name": "View History",
      "short_name": "History",
      "url": "/history",
      "icons": [{ "src": "/shortcuts/history.png", "sizes": "96x96" }]
    }
  ],
  "share_target": {
    "action": "/share",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url",
      "files": [{
        "name": "image",
        "accept": ["image/*"]
      }]
    }
  }
}
```

#### Install Experience (2 hours)

**PWA Install Prompt**:
```typescript
// components/pwa/install-prompt.tsx
export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  
  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show custom install prompt after user engagement
      if (hasUserEngagement()) {
        setShowPrompt(true);
      }
    });
  }, []);
  
  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      trackEvent('pwa_installed');
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };
  
  if (!showPrompt) return null;
  
  return (
    <Card className="fixed bottom-20 left-4 right-4 z-50">
      <CardContent className="p-4">
        <h3 className="font-semibold">Install VetMed Tracker</h3>
        <p className="text-sm text-muted-foreground">
          Install the app for offline access and notifications
        </p>
        <div className="flex gap-2 mt-3">
          <Button onClick={handleInstall}>Install</Button>
          <Button variant="ghost" onClick={() => setShowPrompt(false)}>
            Maybe Later
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Success Metrics

### Performance Metrics
| Metric | Current | Target | Tool |
|--------|---------|--------|------|
| First Contentful Paint | 2.8s | < 1.5s | Lighthouse |
| Largest Contentful Paint | 4.2s | < 2.5s | Lighthouse |
| Time to Interactive | 5.1s | < 3.0s | Lighthouse |
| Bundle Size (Initial) | 380KB | < 250KB | Webpack Analyzer |
| PWA Score | 75 | > 95 | Lighthouse |

### Service Worker Metrics
- Cache hit rate > 80%
- Background sync success rate > 95%
- Push notification delivery rate > 90%
- Offline functionality coverage 100%

---

## Testing Strategy

### Performance Testing
- [ ] Lighthouse CI in build pipeline
- [ ] Bundle size monitoring
- [ ] Real device performance testing
- [ ] Network throttling tests

### PWA Testing
- [ ] Offline functionality testing
- [ ] Background sync testing
- [ ] Push notification testing
- [ ] Install flow testing

### Cross-Platform Testing
- [ ] iOS Safari PWA features
- [ ] Android Chrome PWA features
- [ ] Desktop PWA installation
- [ ] Various network conditions

---

## Phase 3 Checklist

### Pre-Development
- [ ] Performance baseline measured
- [ ] Bundle analysis completed
- [ ] Service worker strategy defined
- [ ] Push notification service configured

### Development
- [ ] Bundle optimization complete
- [ ] Image optimization implemented
- [ ] React performance optimized
- [ ] Service worker enhanced
- [ ] Push notifications working
- [ ] PWA manifest updated

### Testing
- [ ] Performance targets met
- [ ] Offline mode fully functional
- [ ] Push notifications tested
- [ ] Cross-platform PWA tested

### Documentation
- [ ] Performance optimization guide
- [ ] Service worker documentation
- [ ] PWA features documented
- [ ] Deployment guide updated

### Sign-off
- [ ] Performance benchmarks passed
- [ ] PWA audit passed
- [ ] QA testing complete
- [ ] Ready for Phase 4