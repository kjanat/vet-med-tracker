import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "@/stack/server";

// Force dynamic rendering to prevent build-time issues with Stack Auth
// TODO: Uncomment the following:
// export const dynamic = "force-dynamic";

export default async function Handler(props: {
  params: Promise<{ stack: string[] }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return <StackHandler app={stackServerApp} fullPage routeProps={props} />;
}
