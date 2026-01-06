"use client";

import RequireAuth from "@/components/RequireAuth";
import SidebarTooltip from "@/components/SidebarTooltip";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthUser } from "@/components/useAuthUser";
import { useState } from "react";
import { useDefaultLocation } from "@/components/location/useDefaultLocation";

import {
  LayoutDashboard,
  Users,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Building2,
  MapPin,
} from "lucide-react";

/**
 * ⚠️ CANONICAL RULES
 * - Auth via tw_token cookie
 * - Settings pages MUST NOT require default location
 */

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const auth = useAuthUser();
  const user = auth.user;

  const isSettingsPage =
    pathname.startsWith("/dashboard/settings") ||
    pathname.startsWith("/dashboard/organization");

  const { locationId, loading: locationLoading } = useDefaultLocation();

  const [collapsed, setCollapsed] = useState(false);

  /* ---------------------------------------------
     Auth guard (always)
  --------------------------------------------- */
  if (auth.loading) {
    return (
      <RequireAuth>
        <div className="flex h-screen items-center justify-center bg-gray-100 text-sm text-gray-600">
          Loading…
        </div>
      </RequireAuth>
    );
  }

  /* ---------------------------------------------
     Default location loading (ONLY non-settings)
  --------------------------------------------- */
  if (!isSettingsPage && locationLoading) {
    return (
      <RequireAuth>
        <div className="flex h-screen items-center justify-center bg-gray-100 text-sm text-gray-600">
          Loading location…
        </div>
      </RequireAuth>
    );
  }

  /* ---------------------------------------------
     Default location required (ONLY non-settings)
  --------------------------------------------- */
  if (!isSettingsPage && !locationId) {
    return (
      <RequireAuth>
        <div className="flex h-screen items-center justify-center bg-gray-100 text-sm text-red-600">
          No active location found. Please create one in
          <span className="ml-1 font-semibold">Settings → Locations</span>.
        </div>
      </RequireAuth>
    );
  }

  function logout() {
    document.cookie =
      "tw_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = "/login";
  }

  /* ---------------------------------------------
     Render
  --------------------------------------------- */
  return (
    <RequireAuth>
      <div className="min-h-screen flex bg-gray-100">
        {/* Sidebar */}
        <aside
          className={`bg-white shadow-md p-4 flex flex-col transition-all ${
            collapsed ? "w-20" : "w-64"
          }`}
        >
          <SidebarTooltip label={collapsed ? "Expand" : "Collapse"}>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="absolute -right-3 top-6 bg-white border rounded-full shadow p-1"
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </SidebarTooltip>

          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-blue-600" />
            {!collapsed && <span>TimeWise Clock</span>}
          </h2>

          <nav className="space-y-1 flex-1">
            <Link
              href="/dashboard"
              className={`flex items-center gap-2 px-3 py-2 rounded-md ${
                pathname === "/dashboard"
                  ? "text-blue-600 font-semibold"
                  : "text-gray-700"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              {!collapsed && <span>Dashboard</span>}
            </Link>

            <Link
              href="/dashboard/employees"
              className={`flex items-center gap-2 px-3 py-2 rounded-md ${
                pathname.startsWith("/dashboard/employees")
                  ? "text-blue-600 font-semibold"
                  : "text-gray-700"
              }`}
            >
              <Users className="w-4 h-4" />
              {!collapsed && <span>Employees</span>}
            </Link>

            {!collapsed && (
              <div className="mt-4 px-3 text-xs font-semibold text-gray-400 uppercase">
                Settings
              </div>
            )}

            <Link
              href="/dashboard/organization"
              className={`flex items-center gap-2 px-3 py-2 rounded-md ${
                pathname.startsWith("/dashboard/organization")
                  ? "text-blue-600 font-semibold"
                  : "text-gray-700"
              }`}
            >
              <Building2 className="w-4 h-4" />
              {!collapsed && <span>Organization</span>}
            </Link>

            <Link
              href="/dashboard/settings/locations"
              className={`flex items-center gap-2 px-3 py-2 rounded-md ${
                pathname.startsWith("/dashboard/settings/locations")
                  ? "text-blue-600 font-semibold"
                  : "text-gray-700"
              }`}
            >
              <MapPin className="w-4 h-4" />
              {!collapsed && <span>Locations</span>}
            </Link>
          </nav>

          <div className="border-t pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                {user?.email?.[0]?.toUpperCase() ?? "U"}
              </div>

              {!collapsed && (
                <div className="flex-1">
                  <div className="font-semibold text-sm truncate">
                    {user?.email}
                  </div>
                  <div className="text-xs text-gray-500 uppercase">
                    {user?.role}
                  </div>
                </div>
              )}

              <button onClick={logout}>
                <LogOut className="w-5 h-5 text-gray-600 hover:text-red-600" />
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </RequireAuth>
  );
}
