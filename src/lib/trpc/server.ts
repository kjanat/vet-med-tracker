import "server-only";

import { headers } from "next/headers";
import { cache } from "react";
import { appRouter } from "@/server/api/root";
import { createCallerFactory, createTRPCContext } from "@/server/api/trpc";

/**
 * Server-side tRPC caller for use in Server Components, Server Actions, and Route Handlers.
 *
 * This provides type-safe server-side data fetching without the overhead of HTTP requests.
 * The caller is cached per request to avoid creating multiple instances.
 *
 * @example
 * ```typescript
 * // In a Server Component
 * import { createCaller } from '@/lib/trpc/server';
 *
 * export default async function UsersPage() {
 *   const trpc = await createCaller();
 *   const users = await trpc.user.getProfile();
 *   return <div>{users.name}</div>;
 * }
 * ```
 *
 * @example
 * ```typescript
 * // In a Server Action
 * 'use server';
 * import { createCaller } from '@/lib/trpc/server';
 *
 * export async function updateProfile(data: ProfileData) {
 *   const trpc = await createCaller();
 *   return await trpc.user.updateProfile(data);
 * }
 * ```
 */
export const createCaller = cache(async () => {
  const headersList = await headers();

  // Create a minimal Request object for context creation
  // This is a workaround since we're calling tRPC directly without HTTP
  const mockRequest = new Request("http://localhost:3000/api/trpc", {
    headers: headersList,
    method: "POST",
  });

  // Create context using the same logic as the API route
  const context = await createTRPCContext({
    info: {
      accept: "application/jsonl" as const,
      calls: [],
      connectionParams: {},
      isBatchCall: false,
      signal: new AbortController().signal,
      type: "query" as const,
      url: new URL("http://localhost:3000/api/trpc"),
    },
    req: mockRequest,
    resHeaders: new Headers(),
  });

  const caller = createCallerFactory(appRouter);
  return caller(context);
});
