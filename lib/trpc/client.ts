// Re-export tRPC client from server location

export type { AppRouter } from "@/server/api/routers/_app";
export { trpc } from "@/server/trpc/client";
