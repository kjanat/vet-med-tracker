/// <reference lib="webworker" />

/**
 * @fileoverview Service Worker for VetMed Tracker PWA
 * Handles offline caching, background sync, and push notifications for medication tracking
 */

// @ts-check

/** @type {string} Cache name for dynamic content */
const CACHE_NAME = "vet-med-tracker-v1";
/** @type {string} Cache name for static app shell files */
const STATIC_CACHE = "static-v1";

/**
 * App shell files to cache for offline functionality
 * @type {string[]}
 */
const APP_SHELL = [
  "/",
  "/history",
  "/inventory",
  "/insights",
  "/settings",
  "/offline",
  "/manifest.json",
];

/**
 * Install event handler - caches app shell files
 * @param {ExtendableEvent} event - Service worker install event
 */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

/**
 * Activate event handler - cleans up old caches and claims clients
 * @param {ExtendableEvent} event - Service worker activate event
 */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

/**
 * Fetch event handler - implements cache-first strategy with network fallback
 * @param {FetchEvent} event - Service worker fetch event
 */
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Skip external requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return (
        response ||
        fetch(event.request)
          .then((fetchResponse) => {
            // Cache successful responses
            if (fetchResponse.status === 200) {
              const responseClone = fetchResponse.clone();
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(event.request, responseClone));
            }
            return fetchResponse;
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (event.request.mode === "navigate") {
              return caches.match("/offline");
            }
          })
      );
    }),
  );
});

/**
 * Background sync event handler - processes offline queue when connectivity returns
 * @param {SyncEvent} event - Service worker background sync event
 */
self.addEventListener("sync", (event) => {
  const tag = event.tag;

  /**
   * Handles background sync operations
   * @returns {Promise<void>}
   */
  const syncHandler = async () => {
    try {
      // Get all clients (open tabs)
      const clients = await self.clients.matchAll();

      // Notify clients to process their queues
      clients.forEach((client) => {
        client.postMessage({
          type: "SYNC",
          domain: tag.replace("sync:", ""),
          timestamp: Date.now(),
        });
      });

      console.log(`Background sync completed for: ${tag}`);
    } catch (error) {
      console.error(`Background sync failed for ${tag}:`, error);
      throw error; // This will cause the sync to be retried
    }
  };

  event.waitUntil(syncHandler());
});

/**
 * Push notification event handler - displays medication reminders and other notifications
 * @param {PushEvent} event - Service worker push event
 */
self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  const data = event.data.json();

  // Default notification options
  /** @type {NotificationOptions} */
  const baseOptions = {
    body: data.body,
    icon: data.icon || "/icon-192x192.png",
    badge: data.badge || "/badge-72x72.png",
    tag: data.tag || "general-notification",
    data: data.data || {},
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
    timestamp: data.timestamp || Date.now(),
  };

  // Add image if provided
  if (data.image) {
    baseOptions.image = data.image;
  }

  event.waitUntil(self.registration.showNotification(data.title, baseOptions));
});

/**
 * Notification click event handler - handles user interaction with various notification types
 * @param {NotificationEvent} event - Service worker notification click event
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const { action, data = {} } = event;
  const notificationType = data.type || "general";

  let url = "/";

  // Handle different notification types and actions
  switch (notificationType) {
    case "medication_reminder":
      if (action === "record" && data.animalId && data.regimenId) {
        url = `/admin/record?animalId=${data.animalId}&regimenId=${data.regimenId}`;
      } else if (action === "snooze") {
        // Post message to app to handle snooze
        event.waitUntil(
          clients.matchAll({ type: "window" }).then((clientList) => {
            if (clientList.length > 0) {
              clientList[0].postMessage({
                type: "SNOOZE_NOTIFICATION",
                data: {
                  regimenId: data.regimenId,
                  animalId: data.animalId,
                  minutes: 15,
                },
              });
              return clientList[0].focus();
            }
            return clients.openWindow("/");
          }),
        );
        return;
      } else {
        url = "/";
      }
      break;

    case "low_inventory":
      if (action === "view_inventory") {
        url = "/inventory";
      } else if (action === "dismiss") {
        // Just close, no navigation needed
        return;
      } else {
        url = "/inventory";
      }
      break;

    case "cosign_request":
      if (action === "approve" || action === "review") {
        url = `/cosign/${data.cosignRequestId}`;
      } else {
        url = "/admin";
      }
      break;

    case "system_announcement":
      url = "/settings";
      break;

    case "test":
      url = "/settings/notifications";
      break;

    default:
      url = data.url || "/";
      break;
  }

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      // Focus existing window if available and URL matches
      for (const client of clientList) {
        const clientURL = new URL(client.url);
        const targetURL = new URL(url, self.location.origin);

        if (clientURL.pathname === targetURL.pathname && "focus" in client) {
          return client.focus();
        }
      }

      // Open new window or navigate existing one
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    }),
  );
});
