import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { exampleRouter } from "@/server/api/routers/clerk-example";
import { createContext } from "@/server/api/trpc/clerk-context";

const handler = (req: Request) =>
	fetchRequestHandler({
		endpoint: "/api/clerk-trpc",
		req,
		router: exampleRouter,
		createContext,
	});

export { handler as GET, handler as POST };
