import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "@/stack";

// Force dynamic rendering to prevent build-time issues with Stack Auth
export const dynamic = "force-dynamic";

export default async function Handler(props: {
  params: Promise<{ stack: string[] }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return <StackHandler fullPage app={stackServerApp} routeProps={props} />;
}
