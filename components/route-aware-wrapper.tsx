"use client";

import { usePathname } from "next/navigation";

interface RouteAwareWrapperProps {
  children: React.ReactNode;
  hideOnRoutes: string[];
}

export function RouteAwareWrapper({ children, hideOnRoutes }: RouteAwareWrapperProps) {
  const pathname = usePathname();
  const shouldHide = hideOnRoutes.some((route) => pathname === route || pathname?.startsWith(route + "/"));

  if (shouldHide) return null;
  return <>{children}</>;
}
