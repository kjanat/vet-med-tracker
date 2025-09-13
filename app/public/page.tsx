import { redirect } from "next/navigation";

/**
 * Backward compatibility redirect from old /public route to new root route
 * Ensures existing bookmarks and links continue to work
 */
export default function PublicPageRedirect() {
  redirect("/");
}
