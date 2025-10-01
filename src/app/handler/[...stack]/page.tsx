import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "@/stack/server";

export default async function Handler(props: {
  params: Promise<{ stack: string[] }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return <StackHandler app={stackServerApp} fullPage routeProps={props} />;
}
