import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import data from "@/lib/data.json";

const pageMap: Record<string, keyof typeof data.pageVisibility> = {
  "/": "home",
  "/music": "music",
  "/merch": "merch",
  "/shows": "shows",
  "/about": "about",
  "/media": "media",
  "/press": "press",
  "/contact": "contact",
  "/live": "live",
};

export default auth((req) => {
  try {
    const { nextUrl } = req;
    const pathname = nextUrl.pathname;
    const isLoggedIn = !!req.auth;
    const isAdminRoute = pathname.startsWith("/admin");
    const isApiAdminRoute = pathname.startsWith("/api/admin");
    const isLoginPage = pathname === "/admin/login";
    const isAuthApiRoute = pathname.startsWith("/api/auth");

    // Allow auth API routes
    if (isAuthApiRoute) {
      return NextResponse.next();
    }

    // Protect admin API routes
    if (isApiAdminRoute && !isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Protect admin pages
    if (isAdminRoute && !isLoggedIn && !isLoginPage) {
      const loginUrl = new URL("/admin/login", nextUrl);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check page visibility for public routes (not logged in)
    if (!isLoggedIn && !isAdminRoute && !pathname.startsWith("/api/") && !pathname.startsWith("/_next/")) {
      const pageKey = pageMap[pathname];
      if (pageKey) {
        const visibility = data.pageVisibility ?? {};
        if (visibility[pageKey] === false) {
          return NextResponse.rewrite(new URL("/not-found", nextUrl), { status: 404 });
        }
      }
    }

    return NextResponse.next();
  } catch (error) {
    console.error("[MIDDLEWARE] Error:", error);
    return NextResponse.next();
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|audio/|images/|models/).*)"],
};
