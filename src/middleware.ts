import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const incomingId = req.headers.get("x-request-id")?.trim();
  const requestId = incomingId && /^[A-Za-z0-9._:-]{8,100}$/.test(incomingId) ? incomingId : crypto.randomUUID();
  const res = NextResponse.next();
  res.headers.set("x-request-id", requestId);
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set("Content-Security-Policy", "frame-ancestors 'none'");

  const isDashboard = req.nextUrl.pathname.startsWith("/dashboard");
  const isAdmin = req.nextUrl.pathname.startsWith("/admin");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without configuration, createServerClient throws and the whole
  // middleware fails — every protected route answers an opaque
  // MIDDLEWARE_INVOCATION_FAILED 500 with nothing to diagnose from. That is
  // exactly what a deployment missing its environment variables looks like,
  // and a 500 is the least useful way to say so.
  //
  // Failing CLOSED is the safe direction: with no way to verify a session,
  // nobody gets into a protected route.
  if (!supabaseUrl || !supabaseAnonKey) {
    if (isDashboard || isAdmin) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("notice", "unconfigured");
      return NextResponse.redirect(loginUrl);
    }
    return res;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // A network failure reaching Supabase must not 500 either. Treating an
  // unverifiable session as "no user" sends the visitor to sign in, which
  // is both recoverable and the safe direction.
  let user = null;
  try {
    ({
      data: { user },
    } = await supabase.auth.getUser());
  } catch {
    if (isDashboard || isAdmin) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("notice", "unavailable");
      return NextResponse.redirect(loginUrl);
    }
    return res;
  }

  if ((isDashboard || isAdmin) && !user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirectTo", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdmin && user) {
    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
