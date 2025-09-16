"use client";

import { LogIn } from "lucide-react";
import { useCallback } from "react";

import { useAuth } from "@/components/providers/app-provider-consolidated";
import { Button } from "@/components/ui/button";

interface LoginButtonProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function LoginButton({
  variant = "default",
  size = "default",
  className,
}: LoginButtonProps) {
  const auth = useAuth();
  const loginFn = typeof auth?.login === "function" ? auth.login : undefined;
  const isLoading = Boolean(auth?.isLoading);

  const handleLogin = useCallback(() => {
    if (isLoading || !loginFn) {
      return;
    }

    return loginFn();
  }, [isLoading, loginFn]);

  return (
    <Button
      type="button"
      onClick={handleLogin}
      disabled={isLoading}
      variant={variant}
      size={size}
      className={className}
    >
      <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
      Sign In
    </Button>
  );
}
