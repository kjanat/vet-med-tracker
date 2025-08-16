/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

interface ExtendableEvent {
  waitUntil(fn: Promise<unknown>): void;
}

interface FetchEvent extends ExtendableEvent {
  request: Request;

  respondWith(response: Promise<Response> | Response): void;
}

interface InstallEvent extends ExtendableEvent {}

interface ActivateEvent extends ExtendableEvent {}

interface SyncEvent extends ExtendableEvent {
  tag: string;
  lastChance: boolean;
}

interface PeriodicSyncEvent extends ExtendableEvent {
  tag: string;
}
