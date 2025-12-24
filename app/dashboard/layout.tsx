"use client";

import RequireAuth from "@/components/RequireAuth";
import SidebarTooltip from "@/components/SidebarTooltip";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthUser } from "@/components/useAuthUser";
import { useState, useEffect } from "react";
import { useDefaultLocation } from "@/components/location/useDefaultLocation";

import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarRange,
  Settings,
  MapPin,
  FileText,
  LogOut,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  MapPinOff,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

interface Location {
  id: number;
  name: string;
  isActive: boolean;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const user = useAuthUser();

  /* ---------------------------------------------
     🔑 Location state (auto + manual)
  --------------------------------------------- */
  const {
    locationId,
    setLocationId,
    loading: locationLoading,
  } = useDefaultLocation();

  const [locations, setLocations] = useState<Location[]>([]);
  const [locationMenuOpen, setLocationMenuOpen] = useState(false);

  const [collapsed, setCollapsed] = useState(false);
  const [openTimecards, setOpenTimecards] = useState(false);

  /* ---------------------------------------------
     Load locations list for selector
  --------------------------------------------- */
  useEffect(() => {
    async function loadLocations() {
      try {
        const res = await fetch(`${API}/api/locations`, {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        setLocations(data.filter((l: Location) => l.isActive));
      } catch (err) {
        console.error("Failed to load locations", err);
      }
    }

    loadLocations();
  }, []);

  useEffect(() => {
    if (
      pathname.startsWith("/dashboard/timecards/payperiods") ||
      pathname === "/dashboard/timecards"
    ) {
      setOpenTimecards(true);
    }
  }, [pathname]);

  const isActive = (path: string) => pathname === path;
  const isGroupActive = pathname.startsWith("/dashboard/timecards");

  /* ---------------------------------------------
     Guard: wait for location
  --------------------------------------------- */
  if (locationLoading) {
    return (
      <RequireAuth>
        <div className="flex h-screen items-center justify-center bg-gray-100 text-sm text-gray-600">
          Loading location…
        </div>
      </RequireAuth>
    );
  }

  if (!locationId) {
    return (
      <RequireAuth>
        <div className="flex h-screen items-center justify-center bg-gray-100 text-sm text-red-600">
          No active location found. Please create one in Settings → Locations.
        </div>
      </RequireAuth>
    );
  }

  const currentLocation = locations.find((l) => l.id === locationId);

  function logout() {
    document.cookie =
      "tw_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = "/login";
  }

  function switchLocation(id: number) {
    setLocationId(id);
    setLocationMenuOpen(false);
    window.location.reload(); // safest + simplest
  }

  /* ---------------------------------------------
     Styles (unchanged)
  --------------------------------------------- */
  const fade = (hidden: boolean) =>
    `transition-all duration-300 ease-in-out ${
      hidden
        ? "opacity-0 translate-x-2 pointer-events-none"
        : "opacity-100 translate-x-0"
    }`;

  const glowBar = (active: boolean) =>
    active
      ? "absolute left-0 top-0 h-full w-[3px] bg-blue-500 shadow-[0_0_8px_2px_rgba(37,99,235,0.7)] rounded-r-md"
      : "";

  const glowSubBar = (active: boolean) =>
    active
      ? "absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] bg-blue-500 shadow-[0_0_6px_2px_rgba(37,99,235,0.6)] rounded-r-md"
      : "";

  const navItemStyle = (active: boolean) =>
    `relative flex items-center gap-2 px-2 py-2 rounded-md transition-colors 
     hover:bg-gray-100 cursor-pointer pl-5
     ${active ? "text-blue-600 font-semibold" : "text-gray-700"}`;

  const subItemStyle = (active: boolean) =>
    `relative ml-6 flex items-center gap-2 px-2 py-1 rounded-md transition-colors 
     hover:bg-gray-100 cursor-pointer text-sm pl-5
     ${active ? "text-blue-600 font-semibold" : "text-gray-600"}`;

  const headerStyle = (hidden: boolean) =>
    `text-xs font-bold text-gray-500 mt-6 mb-2 px-2 transition-all duration-300 ${
      hidden
        ? "opacity-0 translate-x-2 h-0 overflow-hidden"
        : "opacity-100 translate-x-0"
    }`;

  function getInitials(name?: string) {
    if (!name) return "U";
    const p = name.split(" ");
    return (p[0][0] + (p[1]?.[0] || "")).toUpperCase();
  }

  return (
    <RequireAuth>
      <div className="min-h-screen flex bg-gray-100">
        <aside
          className={`bg-white shadow-md p-4 max-h-screen flex flex-col transition-all duration-300 ${
            collapsed ? "w-20" : "w-64"
          }`}
        >
          {/* Collapse Toggle */}
          <SidebarTooltip label={collapsed ? "Expand" : "Collapse"}>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="absolute -right-3 top-6 bg-white border rounded-full shadow p-1 z-50"
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </SidebarTooltip>

          {/* LOGO */}
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-blue-600" />
            {!collapsed && <span>TimeWise Clock</span>}
          </h2>

          {/* 🔽 LOCATION SELECTOR */}
          {!collapsed && (
            <div className="relative mb-4">
              <button
                onClick={() => setLocationMenuOpen(!locationMenuOpen)}
                className="flex w-full items-center justify-between rounded-lg border bg-gray-50 px-3 py-2 text-sm hover:bg-gray-100"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">
                    {currentLocation?.name || "Select Location"}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4" />
              </button>

              {locationMenuOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border bg-white shadow-lg">
                  {locations.map((loc) => (
                    <button
                      key={loc.id}
                      onClick={() => switchLocation(loc.id)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 ${
                        loc.id === locationId
                          ? "bg-blue-50 text-blue-600 font-semibold"
                          : ""
                      }`}
                    >
                      <MapPin className="h-4 w-4" />
                      {loc.name}
                    </button>
                  ))}
                  {locations.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500 flex items-center gap-2">
                      <MapPinOff className="h-4 w-4" />
                      No active locations
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* NAVIGATION (unchanged) */}
          <nav className="space-y-1 overflow-y-auto flex-1">
            <div className={headerStyle(collapsed)}>MAIN</div>

            <Link
              href="/dashboard"
              className={navItemStyle(isActive("/dashboard"))}
            >
              <span className={glowBar(isActive("/dashboard"))}></span>
              <LayoutDashboard className="w-4 h-4" />
              {!collapsed && <span className={fade(false)}>Dashboard</span>}
            </Link>

            <Link
              href="/dashboard/employees"
              className={navItemStyle(isActive("/dashboard/employees"))}
            >
              <span className={glowBar(isActive("/dashboard/employees"))}></span>
              <Users className="w-4 h-4" />
              {!collapsed && <span className={fade(false)}>Employees</span>}
            </Link>

            <div className={headerStyle(collapsed)}>TIME & PAY</div>

            <div
              className={navItemStyle(isGroupActive)}
              onClick={() => setOpenTimecards(!openTimecards)}
            >
              <span className={glowBar(isGroupActive)}></span>
              <Clock className="w-4 h-4" />
              {!collapsed && (
                <>
                  <span className={fade(false)}>Timecards</span>
                  <span className="ml-auto">
                    {openTimecards ? <ChevronDown /> : <ChevronRight />}
                  </span>
                </>
              )}
            </div>

            {!collapsed && openTimecards && (
              <>
                <Link
                  href="/dashboard/timecards"
                  className={subItemStyle(
                    isActive("/dashboard/timecards")
                  )}
                >
                  <Clock className="w-3 h-3" />
                  <span>Summary</span>
                </Link>

                <Link
                  href="/dashboard/timecards/payperiods"
                  className={subItemStyle(
                    isActive("/dashboard/timecards/payperiods")
                  )}
                >
                  <CalendarRange className="w-3 h-3" />
                  <span>Payroll Periods</span>
                </Link>
              </>
            )}

            <div className={headerStyle(collapsed)}>SETTINGS</div>

            <Link
              href="/dashboard/settings/company"
              className={navItemStyle(
                isActive("/dashboard/settings/company")
              )}
            >
              <Settings className="w-4 h-4" />
              {!collapsed && <span>Company Settings</span>}
            </Link>

            <Link
              href="/dashboard/settings/locations"
              className={navItemStyle(
                isActive("/dashboard/settings/locations")
              )}
            >
              <MapPin className="w-4 h-4" />
              {!collapsed && <span>Locations</span>}
            </Link>

            <div className={headerStyle(collapsed)}>REPORTS</div>

            <Link
              href="/dashboard/reports/timesheet"
              className={navItemStyle(
                isActive("/dashboard/reports/timesheet")
              )}
            >
              <FileText className="w-4 h-4" />
              {!collapsed && <span>Reports</span>}
            </Link>
          </nav>

          {/* USER PANEL */}
          <div className="border-t pt-4 mt-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                {getInitials(user?.name)}
              </div>

              {!collapsed && (
                <div className="flex-1">
                  <div className="font-semibold text-sm">{user?.name}</div>
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
