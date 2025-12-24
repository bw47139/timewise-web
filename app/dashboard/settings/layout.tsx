"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/auth";

import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Read token from cookie
    const token = getAuthToken();

    // If no token, go back to login
    if (!token) {
      router.replace("/login");
      return;
    }

    // If we have token, stop "loading" and show dashboard
    setLoading(false);
  }, [router]);

  // While we are checking the token, show loading text
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Loading dashboard…</p>
      </div>
    );
  }

  // When token exists, show the real dashboard layout
  return (
    <div className="flex">
      <Sidebar />

      <div className="flex flex-col w-full ml-64">
        <Topbar />
        <main className="p-6 bg-gray-100 min-h-screen">{children}</main>
      </div>
    </div>
  );
}
