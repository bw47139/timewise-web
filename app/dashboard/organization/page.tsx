"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/* ======================================================
   Types
====================================================== */

interface Organization {
  id: number;
  name: string;
  timezone: string;
}

/* ======================================================
   Component
====================================================== */

export default function OrganizationPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* --------------------------------------------------
     Load organization (AUTH-AWARE)
  -------------------------------------------------- */
  useEffect(() => {
    async function loadOrg() {
      try {
        const res = await fetch("/api/organization/me", {
          credentials: "include",
        });

        if (!res.ok) {
          setError("Failed to load organization");
          return;
        }

        const data = await res.json();
        setOrg(data);
      } catch {
        setError("Failed to load organization");
      } finally {
        setLoading(false);
      }
    }

    loadOrg();
  }, []);

  /* --------------------------------------------------
     Save
  -------------------------------------------------- */
  async function save() {
    if (!org) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/organization/${org.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: org.name,
          timezone: org.timezone,
        }),
      });

      if (!res.ok) {
        throw new Error();
      }

      alert("Organization saved successfully");
    } catch {
      setError("Failed to save organization");
    } finally {
      setSaving(false);
    }
  }

  /* --------------------------------------------------
     States
  -------------------------------------------------- */
  if (loading) {
    return <div className="p-6 text-sm text-gray-600">Loading organization…</div>;
  }

  if (!org) {
    return (
      <div className="p-6 text-sm text-red-600">
        {error ?? "Organization not found"}
      </div>
    );
  }

  /* --------------------------------------------------
     Render
  -------------------------------------------------- */
  return (
    <div className="max-w-xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">Organization Settings</h1>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {/* Organization Name */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Organization Name
        </label>
        <Input
          value={org.name}
          onChange={(e) =>
            setOrg({ ...org, name: e.target.value })
          }
        />
      </div>

      {/* Timezone */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Timezone
        </label>
        <Input
          value={org.timezone}
          onChange={(e) =>
            setOrg({ ...org, timezone: e.target.value })
          }
        />
      </div>

      <Button onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save Organization"}
      </Button>
    </div>
  );
}
