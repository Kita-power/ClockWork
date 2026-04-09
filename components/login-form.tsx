"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getRoleHomePath } from "@/lib/role-home-path";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("No user returned after login");
      }

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      router.push(getRoleHomePath(profile?.role));
      router.refresh();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-8 rounded-2xl border bg-background p-8 md:p-10",
        className,
      )}
      {...props}
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex items-center justify-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Clockwork</h1>
          <span aria-hidden="true" className="text-3xl leading-none text-muted-foreground">
            |
          </span>
          <Image
            src="/fdm-logo.svg"
            alt="FDM logo"
            width={72}
            height={23}
            className="h-6 w-auto dark:hidden"
          />
          <Image
            src="/fdm-logo-dark.svg"
            alt="FDM logo"
            width={72}
            height={23}
            className="hidden h-6 w-auto dark:block"
          />
        </div>
        <h2 className="text-3xl font-semibold tracking-tight">Login</h2>
      </div>

      <form onSubmit={handleLogin}>
        <div className="flex flex-col gap-6">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="John@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/auth/forgot-password"
                className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              required
              value={password}
              placeholder="At least 8 characters"
              onChange={(e) => setPassword(e.target.value)}
              className="h-11"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button
            type="submit"
            className="mt-2 h-11 w-full"
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Login to your account"}
          </Button>
        </div>
      </form>
    </div>
  );
}
