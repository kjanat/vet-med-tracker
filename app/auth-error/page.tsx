"use client";

import { AlertCircle, Clock, RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
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
  const [countdown, setCountdown] = useState(0);
  const [canRetry, setCanRetry] = useState(false);

  useEffect(() => {
    // If rate limited, start a 15-minute countdown
    if (error === "rate_limit" || error === "too_many_requests") {
      const waitTime = 15 * 60; // 15 minutes in seconds
      setCountdown(waitTime);
      setCanRetry(false);

      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setCanRetry(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    } else {
      setCanRetry(true);
    }
  }, [error]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getErrorInfo = () => {
    switch (error) {
      case "rate_limit":
      case "too_many_requests":
        return {
          title: "Rate Limit Exceeded",
          description:
            "You've made too many authentication attempts. Please wait before trying again.",
          icon: Clock,
          color: "text-orange-600",
        };
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

  const handleRetry = () => {
    // Clear any cached auth state
    if (typeof window !== "undefined") {
      // Clear cookies for Stack Auth
      document.cookie.split(";").forEach((c) => {
        if (c.includes("stack-auth")) {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
        }
      });
    }

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
          {countdown > 0 && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertTitle>Please Wait</AlertTitle>
              <AlertDescription>
                You can try again in{" "}
                <span className="font-mono font-semibold">
                  {formatTime(countdown)}
                </span>
              </AlertDescription>
            </Alert>
          )}

          {error === "rate_limit" && (
            <div className="rounded-lg bg-muted p-4 text-sm">
              <p className="font-medium">Why am I seeing this?</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
                <li>Multiple failed login attempts</li>
                <li>Rapid repeated requests to the auth service</li>
                <li>Browser automation or testing tools</li>
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleRetry}
              disabled={!canRetry}
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {canRetry ? "Try Again" : `Wait ${formatTime(countdown)}`}
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
