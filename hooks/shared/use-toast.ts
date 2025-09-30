"use client";

import type React from "react";
import { useSyncExternalStore } from "react";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

// Types & Constants
const TOAST_LIMIT = 1;
const DEFAULT_DURATION = 4000;
const EXIT_REMOVE_DELAY = 200;

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  duration?: number | typeof Infinity;
};

type ToastInput = Omit<ToasterToast, "id">;

interface ToastAPI {
  id: string;
  dismiss: () => void;
  update: (props: Partial<ToasterToast>) => void;
}

interface State {
  toasts: ToasterToast[];
}

// ID Generation
class IdGenerator {
  private count = 0;

  next(): string {
    this.count = (this.count + 1) % Number.MAX_SAFE_INTEGER;
    return this.count.toString();
  }
}

const idGen = new IdGenerator();

// Timer Management
class TimerManager {
  private autoDismissTimers: Map<string, NodeJS.Timeout> = new Map<
    string,
    NodeJS.Timeout
  >();
  private removeTimers: Map<string, NodeJS.Timeout> = new Map<
    string,
    NodeJS.Timeout
  >();

  clearAll(id: string): void {
    this.clearTimer(this.autoDismissTimers, id);
    this.clearTimer(this.removeTimers, id);
  }

  scheduleAutoDismiss(
    id: string,
    duration: number,
    onDismiss: () => void,
  ): void {
    if (duration === Infinity) return;

    this.clearAll(id);
    this.autoDismissTimers.set(id, setTimeout(onDismiss, duration));
  }

  scheduleRemoval(id: string, onRemove: () => void): void {
    if (this.removeTimers.has(id)) return;

    this.removeTimers.set(
      id,
      setTimeout((): void => {
        this.removeTimers.delete(id);
        onRemove();
      }, EXIT_REMOVE_DELAY),
    );
  }

  private clearTimer(map: Map<string, NodeJS.Timeout>, id: string): void {
    const timer: NodeJS.Timeout | undefined = map.get(id);
    if (timer) {
      clearTimeout(timer);
      map.delete(id);
    }
  }
}

// Store Actions
enum ActionType {
  ADD_TOAST = "ADD_TOAST",
  UPDATE_TOAST = "UPDATE_TOAST",
  DISMISS_TOAST = "DISMISS_TOAST",
  REMOVE_TOAST = "REMOVE_TOAST",
}

type Action =
  | { type: ActionType.ADD_TOAST; toast: ToasterToast }
  | {
      type: ActionType.UPDATE_TOAST;
      toast: Partial<ToasterToast> & { id: string };
    }
  | { type: ActionType.DISMISS_TOAST; toastId?: string }
  | { type: ActionType.REMOVE_TOAST; toastId?: string };

// State Reducers
class StateReducers {
  constructor(private timers: TimerManager) {}

  addToast(state: State, toast: ToasterToast): State {
    const newToasts: ((ToastProps & ToasterToast) | ToasterToast)[] = [
      toast,
      ...state.toasts,
    ].slice(0, TOAST_LIMIT);

    // Clear timers for any toasts that got pushed out
    state.toasts
      .slice(TOAST_LIMIT)
      .forEach((t: ToastProps & ToasterToast): void => {
        this.timers.clearAll(t.id);
      });

    return { ...state, toasts: newToasts };
  }

  updateToast(
    state: State,
    update: Partial<ToasterToast> & { id: string },
  ): State {
    return {
      ...state,
      toasts: state.toasts.map(
        (t: ToastProps & ToasterToast): ToasterToast =>
          t.id === update.id ? { ...t, ...update } : t,
      ),
    };
  }

  dismissToasts(state: State, toastId?: string): State {
    const targetIds: string[] = toastId
      ? [toastId]
      : state.toasts.map((t: ToastProps & ToasterToast): string => t.id);
    const idSet = new Set(targetIds);

    return {
      ...state,
      toasts: state.toasts.map(
        (t: ToasterToast): ToasterToast =>
          idSet.has(t.id) ? { ...t, open: false } : t,
      ),
    };
  }

  removeToasts(state: State, toastId?: string): State {
    if (!toastId) {
      state.toasts.forEach((t: ToasterToast): void => {
        this.timers.clearAll(t.id);
      });
      return { ...state, toasts: [] };
    }

    this.timers.clearAll(toastId);
    return {
      ...state,
      toasts: state.toasts.filter(
        (t: ToasterToast): boolean => t.id !== toastId,
      ),
    };
  }
}

// Toast Store
class ToastStore {
  private state: State = { toasts: [] };
  private listeners: Set<(state: State) => void> = new Set<
    (state: State) => void
  >();
  private timers: TimerManager = new TimerManager();
  private reducers: StateReducers = new StateReducers(this.timers);

  getSnapshot: () => State = (): State => this.state;

  subscribe: (listener: (state: State) => void) => () => void = (
    listener: (state: State) => void,
  ): (() => void) => {
    this.listeners.add(listener);
    return (): undefined => void this.listeners.delete(listener);
  };

  dispatch: (action: Action) => void = (action: Action): void => {
    this.state = this.reduce(this.state, action);
    this.notify();
  };

  scheduleAutoDismiss(id: string, duration: number): void {
    this.timers.scheduleAutoDismiss(id, duration, (): void => {
      this.dispatch({ toastId: id, type: ActionType.DISMISS_TOAST });
    });
  }

  private reduce(state: State, action: Action): State {
    switch (action.type) {
      case ActionType.ADD_TOAST:
        return this.reducers.addToast(state, action.toast);

      case ActionType.UPDATE_TOAST:
        return this.reducers.updateToast(state, action.toast);

      case ActionType.DISMISS_TOAST: {
        const ids: string[] = action.toastId
          ? [action.toastId]
          : state.toasts.map((t: ToasterToast): string => t.id);
        ids.forEach((id: string): void => {
          this.scheduleDeferredRemoval(id);
        });
        return this.reducers.dismissToasts(state, action.toastId);
      }

      case ActionType.REMOVE_TOAST:
        return this.reducers.removeToasts(state, action.toastId);

      default:
        return state;
    }
  }

  private notify(): void {
    this.listeners.forEach((listener: (state: State) => void): void => {
      listener(this.state);
    });
  }

  private scheduleDeferredRemoval(id: string): void {
    this.timers.scheduleRemoval(id, (): void => {
      this.dispatch({ toastId: id, type: ActionType.REMOVE_TOAST });
    });
  }
}

// Store Instance
const store = new ToastStore();

// Public API
function toast(props: ToastInput): ToastAPI {
  const id: string = idGen.next();
  const duration: number = props["duration"] ?? DEFAULT_DURATION;

  const api: ToastAPI = {
    dismiss: (): void =>
      store.dispatch({ toastId: id, type: ActionType.DISMISS_TOAST }),
    id,
    update: (next: Partial<ToasterToast>): void =>
      store.dispatch({
        toast: { ...next, id },
        type: ActionType.UPDATE_TOAST,
      }),
  };

  const enrichedToast: ToasterToast = {
    ...props,
    id,
    onOpenChange: (open: boolean): void => {
      if (!open) api.dismiss();
      props["onOpenChange"]?.(open);
    },
    open: true,
  };

  store.dispatch({ toast: enrichedToast, type: ActionType.ADD_TOAST });

  if (duration !== Infinity) {
    store.scheduleAutoDismiss(id, duration);
  }

  return api;
}

function useToast(): {
  toasts: ToasterToast[];
  toast: (props: ToastInput) => ToastAPI;
  dismiss: (toastId?: string) => void;
} {
  const state: State = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );

  return {
    dismiss: (toastId?: string): void =>
      store.dispatch({ toastId, type: ActionType.DISMISS_TOAST }),
    toast,
    toasts: state.toasts,
  };
}

export { useToast, toast };
export type { ToastInput, ToasterToast, ToastAPI };
