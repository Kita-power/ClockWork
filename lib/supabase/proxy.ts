import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";
import { getRoleHomePath } from "../role-home-path";

type UserRole = "admin" | "manager" | "finance" | "consultant";

const ROLE_PREFIXES: Record<UserRole, string> = {
  admin: "/admin",
  manager: "/manager",
  finance: "/finance",
  consultant: "/consultant",
};

const PUBLIC_PATH_PREFIXES = ["/", "/auth"];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") {
    return true;
  }

  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => prefix !== "/" && pathname.startsWith(prefix),
  );
}

function getRequiredRoleForPath(pathname: string): UserRole | null {
  for (const [role, prefix] of Object.entries(ROLE_PREFIXES) as Array<[UserRole, string]>) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return role;
    }
  }
  return null;
}

function isKnownRole(value: string | null | undefined): value is UserRole {
  return value === "admin" || value === "manager" || value === "finance" || value === "consultant";
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // If the env vars are not set, skip proxy check. You can remove this
  // once you setup the project.
  if (!hasEnvVars) {
    return supabaseResponse;
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const pathname = request.nextUrl.pathname;
  const requiredRole = getRequiredRoleForPath(pathname);
  const isProtectedRolePath = requiredRole !== null;

  if (!user && (isProtectedRolePath || !isPublicPath(pathname))) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role, is_active")
      .eq("id", user.sub)
      .maybeSingle();

    const profileRole = profile?.role;
    const isActive = profile?.is_active === true;

    if (profileError || !isKnownRole(profileRole) || !isActive) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }

    if (requiredRole && profileRole !== requiredRole) {
      const url = request.nextUrl.clone();
      url.pathname = getRoleHomePath(profileRole);
      return NextResponse.redirect(url);
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
