"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch(`${API}/api/auth/current`, {
          method: "GET",
          credentials: "include", // 🔥 REQUIRED
        });

        if (!res.ok) {
          throw new Error("Not authenticated");
        }

        // ✅ Auth OK
        setChecking(false);
      } catch (error) {
        console.warn("Auth check failed, redirecting to login");
        router.replace("/login");
      }
    }

    checkAuth();
  }, [router]);

  if (checking) {
    return (
      <div className="p-6 text-gray-500">
        Checking authentication…
      </div>
    );
  }

  return <>{children}</>;
}
