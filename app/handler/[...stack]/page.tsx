import { StackHandler } from "@stackframe/stack";
import { redirect } from "next/navigation";
import { checkRateLimit } from "@/lib/auth/rate-limiter";
import { stackServerApp } from "../../../stack";

export default async function Handler(props: {
  params: Promise<{ stack: string[] }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Await params as required in Next.js 15
  const params = await props.params;
  // Check if this is a sign-in or sign-up request
  const path = params?.stack?.join("/") || "";

  if (path === "sign-in" || path === "sign-up") {
    try {
      const rateLimitType = path === "sign-in" ? "signIn" : "signUp";
      const result = await checkRateLimit(rateLimitType);

      if (result.limited) {
        // Redirect to error page if rate limited
        redirect("/auth-error?error=rate_limit");
      }
    } catch (error) {
      console.error("Rate limit check failed:", error);
      // Continue without rate limiting if Redis is unavailable
    }
  }

  return <StackHandler fullPage app={stackServerApp} routeProps={props} />;
}
