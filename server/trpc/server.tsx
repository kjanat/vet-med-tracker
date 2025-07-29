import "server-only"; // <-- ensure this file cannot be imported from the client
import { createHydrationHelpers } from "@trpc/react-query/rsc";
import { cache } from "react";
import { appRouter } from "../api/routers/_app";
import { createCallerFactory, createTRPCContext } from "../api/trpc/init";
import { makeQueryClient } from "./query-client";
// IMPORTANT: Create a stable getter for the query client that
//            will return the same client during the same request.
export const getQueryClient = cache(makeQueryClient);
const caller = createCallerFactory(appRouter)(() =>
	createTRPCContext({
		req: {
			headers: new Headers(),
		},
	} as Parameters<typeof createTRPCContext>[0]),
);
export const { trpc, HydrateClient } = createHydrationHelpers<typeof appRouter>(
	caller,
	getQueryClient,
);
