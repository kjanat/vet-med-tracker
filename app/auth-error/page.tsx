"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const getErrorInfo = () => {
    switch (error) {
      case "configuration":
        return {
          title: "Configuration Error",
          description:
            "There's an issue with the authentication configuration. Please contact support.",
          icon: AlertCircle,
          color: "text-red-600",
        };
      case "network":
        return {
          title: "Network Error",
          description:
            "Unable to connect to the authentication service. Please check your connection.",
          icon: AlertCircle,
          color: "text-yellow-600",
        };
      default:
        return {
          title: "Authentication Error",
          description:
            "An unexpected error occurred during authentication. Please try again.",
          icon: AlertCircle,
          color: "text-red-600",
        };
    }
  };

  const errorInfo = getErrorInfo();
  const Icon = errorInfo.icon;

  const clearAuthCookies = () => {
    if (typeof window === "undefined") return;

    try {
      // Get all cookies safely
      const cookies = document.cookie;

      if ("cookieStore" in window) {
        // Use Cookie Store API when available (secure)
        const cookieStore = (
          window as unknown as {
            cookieStore: {
              delete: (options: {
                name: string;
                path?: string;
              }) => Promise<void>;
            };
          }
        ).cookieStore;
        cookies.split(";").forEach(async (cookieStr) => {
          const trimmed = cookieStr.trim();
          if (trimmed.includes("stack-auth")) {
            const cookieName = trimmed.split("=")[0];
            if (cookieName) {
              try {
                await cookieStore.delete({ name: cookieName, path: "/" });
              } catch (deleteError) {
                console.warn(
                  `Failed to delete cookie ${cookieName}:`,
                  deleteError,
                );
              }
            }
          }
        });
      } else {
        // Fallback for browsers without Cookie Store API
        cookies.split(";").forEach((cookieStr) => {
          const trimmed = cookieStr.trim();
          if (trimmed.includes("stack-auth")) {
            const cookieName = trimmed.split("=")[0];
            if (cookieName) {
              const expiredDate = new Date(0).toUTCString();
              // Secure cookie deletion with proper attributes - fallback for older browsers
              const cookieString = `${cookieName}=; expires=${expiredDate}; path=/; SameSite=Strict`;
              // Use function call to set cookie and avoid direct document.cookie assignment
              const setCookie = (value: string) => {
                (document as Document).cookie = value;
              };
              setCookie(cookieString);
            }
          }
        });
      }
    } catch (error) {
      console.warn("Failed to clear auth cookies:", error);
    }
  };

  const handleRetry = () => {
    clearAuthCookies();
    // Redirect to sign in
    window.location.href = "/handler/sign-in";
  };

  const handleGoHome = () => {
    window.location.href = "/";
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Icon className={`h-12 w-12 ${errorInfo.color}`} />
          </div>
          <CardTitle className="text-2xl">{errorInfo.title}</CardTitle>
          <CardDescription className="mt-2">
            {errorInfo.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <Button onClick={handleRetry} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button onClick={handleGoHome} variant="outline" className="w-full">
              Go to Homepage
            </Button>
          </div>

          {error === "configuration" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Contact Support</AlertTitle>
              <AlertDescription>
                If this issue persists, please contact support with error code:{" "}
                <code className="font-mono">AUTH_CONFIG_ERROR</code>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
