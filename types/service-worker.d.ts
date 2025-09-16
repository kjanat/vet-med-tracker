/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

interface ExtendableEvent {
  waitUntil(fn: Promise<unknown>): void;
}

interface FetchEvent extends ExtendableEvent {
  request: Request;

  respondWith(response: Promise<Response> | Response): void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface InstallEvent extends ExtendableEvent {
  // Event properties can be added here when needed
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ActivateEvent extends ExtendableEvent {
  // Event properties can be added here when needed
}

interface SyncEvent extends ExtendableEvent {
  tag: string;
  lastChance: boolean;
}

interface PeriodicSyncEvent extends ExtendableEvent {
  tag: string;
}
