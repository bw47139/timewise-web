"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Timecards", href: "/dashboard/timecards" },
  { name: "Employees", href: "/dashboard/employees" },
  { name: "Locations", href: "/dashboard/locations" },
  { name: "Reports", href: "/dashboard/reports" },
  { name: "Payroll Export", href: "/dashboard/payroll" },
  { name: "Settings", href: "/dashboard/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen fixed left-0 top-0 bg-gray-900 text-white p-4">
      <h1 className="text-2xl font-bold mb-6">TimeWise</h1>

      <nav className="flex flex-col gap-3">
        {links.map((item) => {
          // ✅ FIX: highlight parent route + subroutes
          const active =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`p-2 rounded transition ${
                active
                  ? "bg-gray-700 font-semibold"
                  : "hover:bg-gray-800"
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
