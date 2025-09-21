import {
  defaultShouldDehydrateQuery,
  QueryClient,
  type QueryClientConfig,
} from "@tanstack/react-query";

// import superjson from "superjson";

// Set a reasonable default stale time for queries
const STALE_TIME_MS = 30_000;

// Helper types to strip the undefineds off the nested option
type DefaultOptionsStrict = NonNullable<QueryClientConfig["defaultOptions"]>;
type DehydrateOptionsStrict = NonNullable<DefaultOptionsStrict["dehydrate"]>;

// This gives you the exact function signature React Query expects.
// It also types `query` so there’s no implicit any.
export const shouldDehydrateQuery: NonNullable<
  DehydrateOptionsStrict["shouldDehydrateQuery"]
> = (query) =>
  defaultShouldDehydrateQuery(query) || query.state.status === "pending";

const defaultOptions = {
  dehydrate: {
    // serializeData: superjson.serialize,
    shouldDehydrateQuery,
  },
  hydrate: {
    // deserializeData: superjson.deserialize,
  },
  queries: {
    staleTime: STALE_TIME_MS,
  },
} satisfies DefaultOptionsStrict;

export function makeQueryClient(overrides?: QueryClientConfig): QueryClient {
  return new QueryClient({
    ...overrides,
    defaultOptions: {
      ...defaultOptions,
      ...overrides?.defaultOptions,
      dehydrate: {
        ...defaultOptions.dehydrate,
        ...overrides?.defaultOptions?.dehydrate,
      },
      hydrate: {
        ...defaultOptions.hydrate,
        ...overrides?.defaultOptions?.hydrate,
      },
      queries: {
        ...defaultOptions.queries,
        ...overrides?.defaultOptions?.queries,
      },
    },
  });
}
