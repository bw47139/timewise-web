"use client";

import { useEffect, useState } from "react";
import { useUserStore } from "@/store/userStore";
import { clearAuthToken } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();
  const userStore = useUserStore();

  // Prevent Zustand from causing hydration mismatch
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  function logout() {
    clearAuthToken();
    router.replace("/login"); // smoother & prevents back-button flash
  }

  if (!hydrated) {
    // Prevent rendering until Zustand is fully hydrated
    return (
      <header className="h-16 bg-white border-b flex items-center justify-end px-6 sticky top-0" />
    );
  }

  const userName = userStore.user?.name || "Admin";

  return (
    <header className="h-16 bg-white border-b flex items-center justify-end px-6 sticky top-0">
      <div className="flex items-center gap-4">
        <span className="font-medium">{userName}</span>
        <button
          onClick={logout}
          className="px-3 py-1 bg-red-500 text-white rounded"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
