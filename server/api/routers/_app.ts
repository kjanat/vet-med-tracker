import { appRouter } from "../api";

// Re-export the main app router
export { appRouter } from "../api";

// This file exists to provide a consistent import path
// Some parts of the codebase expect to import from here
export default appRouter;
