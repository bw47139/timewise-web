// components/auth/roles.ts

export type Role = "ADMIN" | "MANAGER" | "SUPERVISOR";

export const ROLE_ORDER: Role[] = ["ADMIN", "MANAGER", "SUPERVISOR"];

export function hasRole(
  userRole: Role | undefined,
  allowed: Role[]
): boolean {
  if (!userRole) return false;
  return allowed.includes(userRole);
}
