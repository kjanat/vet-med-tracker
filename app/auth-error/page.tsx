"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function AuthErrorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const errorCode = searchParams.get("errorCode");
  const message = searchParams.get("message");
  const details = searchParams.get("details");

  // Helper function to handle Stack Auth specific errors
  const handleStackAuthError = () => {
    let parsedDetails = null;
    try {
      parsedDetails = details ? JSON.parse(details) : null;
    } catch (e) {
      console.warn("Failed to parse error details:", e);
    }

    const email = parsedDetails?.contact_channel_value;
    const canVerifyEmail = parsedDetails?.would_work_if_email_was_verified;

    return {
      title: "Email Already in Use",
      description: canVerifyEmail
        ? `The email "${email}" is already associated with another account, but it's not verified. Please sign in with your original method and verify your email to use this sign-in option.`
        : `The email "${email}" is already associated with another account. Please sign in with your original method.`,
      icon: AlertCircle,
      color: "text-yellow-600",
      showVerificationHelp: canVerifyEmail,
      email: email,
    };
  };

  // Helper function to handle generic errors
  const handleGenericError = () => {
    switch (error) {
      case "configuration":
        return {
          title: "Configuration Error",
          description:
            "There's an issue with the authentication configuration. Please contact support.",
          icon: AlertCircle,
          color: "text-red-600",
          showVerificationHelp: false,
        };
      case "network":
        return {
          title: "Network Error",
          description:
            "Unable to connect to the authentication service. Please check your connection.",
          icon: AlertCircle,
          color: "text-yellow-600",
          showVerificationHelp: false,
        };
      default:
        return {
          title: "Authentication Error",
          description:
            message ||
            "An unexpected error occurred during authentication. Please try again.",
          icon: AlertCircle,
          color: "text-red-600",
          showVerificationHelp: false,
        };
    }
  };

  const getErrorInfo = () => {
    // Handle Stack Auth specific error codes
    if (errorCode === "CONTACT_CHANNEL_ALREADY_USED_FOR_AUTH_BY_SOMEONE_ELSE") {
      return handleStackAuthError();
    }

    // Handle generic errors
    return handleGenericError();
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
    router.push("/handler/sign-in");
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
            {errorInfo.showVerificationHelp ? (
              <>
                <Button
                  className="w-full"
                  onClick={() => router.push("/handler/sign-in")}
                >
                  Sign In with Original Method
                </Button>
                <Button
                  className="w-full"
                  onClick={handleGoHome}
                  variant="outline"
                >
                  Go to Homepage
                </Button>
              </>
            ) : (
              <>
                <Button className="w-full" onClick={handleRetry}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <Button
                  className="w-full"
                  onClick={handleGoHome}
                  variant="outline"
                >
                  Go to Homepage
                </Button>
              </>
            )}
          </div>

          {errorInfo.showVerificationHelp && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800">
                Email Verification Required
              </AlertTitle>
              <AlertDescription className="text-yellow-700">
                To use this sign-in method, you need to verify your email
                address first. Sign in with your original method, then check
                your email for a verification link.
              </AlertDescription>
            </Alert>
          )}

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

          {errorCode && (
            <Alert className="border-gray-200 bg-gray-50">
              <AlertCircle className="h-4 w-4 text-gray-600" />
              <AlertTitle className="text-gray-800">Error Details</AlertTitle>
              <AlertDescription className="text-gray-700">
                Error Code:{" "}
                <code className="rounded bg-gray-200 px-1 font-mono">
                  {errorCode}
                </code>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          Loading...
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
