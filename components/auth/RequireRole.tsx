"use client";

import { ReactNode } from "react";
import { useAuthUser } from "@/components/useAuthUser";

/**
 * --------------------------------------------------
 * Types
 * --------------------------------------------------
 */
export type Role = "ADMIN" | "MANAGER" | "SUPERVISOR";

type Props = {
  /**
   * Roles allowed to view the content
   * Example: ["ADMIN", "MANAGER"]
   */
  allow: Role[];
  children: ReactNode;
};

/**
 * --------------------------------------------------
 * RequireRole
 *
 * Usage:
 * <RequireRole allow={["ADMIN"]}>
 *   <AdminOnlyComponent />
 * </RequireRole>
 *
 * <RequireRole allow={["ADMIN", "MANAGER"]}>
 *   <ManagementComponent />
 * </RequireRole>
 * --------------------------------------------------
 */
export default function RequireRole({ allow, children }: Props) {
  const { user, loading } = useAuthUser();

  // ⏳ Still loading auth state → render nothing
  if (loading) return null;

  // 🔒 Not logged in
  if (!user) return null;

  // 🚫 Role not permitted → silently hide (correct UX)
  if (!allow.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
