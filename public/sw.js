const CACHE_NAME = "vet-med-tracker-v1";
const STATIC_CACHE = "static-v1";

// App shell files to cache
const APP_SHELL = [
	"/",
	"/history",
	"/inventory",
	"/insights",
	"/settings",
	"/offline",
	"/manifest.json",
];

// Install event - cache app shell
self.addEventListener("install", (event) => {
	event.waitUntil(
		caches
			.open(STATIC_CACHE)
			.then((cache) => cache.addAll(APP_SHELL))
			.then(() => self.skipWaiting()),
	);
});

// Activate event - clean up old caches
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

// Fetch event - serve from cache, fallback to network
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

// Background sync event
self.addEventListener("sync", (event) => {
	const tag = event.tag;

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

// Push notification event
self.addEventListener("push", (event) => {
	if (!event.data) {
		return;
	}

	const data = event.data.json();
	const options = {
		body: data.body,
		icon: "/icon-192x192.png",
		badge: "/badge-72x72.png",
		tag: data.tag || "medication-reminder",
		data: {
			url: data.url || "/",
			animalId: data.animalId,
			regimenId: data.regimenId,
		},
		actions: [
			{
				action: "record",
				title: "Record Now",
				icon: "/icon-check.png",
			},
			{
				action: "snooze",
				title: "Remind in 15min",
				icon: "/icon-clock.png",
			},
		],
		requireInteraction: true,
	};

	event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click event
self.addEventListener("notificationclick", (event) => {
	event.notification.close();

	const { action, data } = event;
	let url = data?.url || "/";

	if (action === "record" && data?.animalId && data?.regimenId) {
		url = `/admin/record?animalId=${data.animalId}&regimenId=${data.regimenId}`;
	} else if (action === "snooze") {
		// Handle snooze action
		url = "/?snooze=15";
	}

	event.waitUntil(
		clients.matchAll({ type: "window" }).then((clientList) => {
			// Focus existing window if available
			for (const client of clientList) {
				if (client.url === url && "focus" in client) {
					return client.focus();
				}
			}

			// Open new window
			if (clients.openWindow) {
				return clients.openWindow(url);
			}
		}),
	);
});
