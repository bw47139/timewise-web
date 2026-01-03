"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Organization {
  id: number;
  name: string;
  timezone: string;
}

export default function OrganizationPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/organization", { credentials: "include" })
      .then((r) => r.json())
      .then(setOrg)
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!org) return;

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
      alert("Failed to save organization");
    } else {
      alert("Organization saved");
    }
  };

  if (loading) {
    return <div className="p-6">Loading organization…</div>;
  }

  if (!org) {
    return (
      <div className="p-6 text-red-600">
        No organization found
      </div>
    );
  }

  return (
    <div className="max-w-xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">Organization Settings</h1>

      <div>
        <label className="block text-sm font-medium">Organization Name</label>
        <Input
          value={org.name}
          onChange={(e) =>
            setOrg({ ...org, name: e.target.value })
          }
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Timezone</label>
        <Input
          value={org.timezone}
          onChange={(e) =>
            setOrg({ ...org, timezone: e.target.value })
          }
        />
      </div>

      <Button onClick={save}>Save Organization</Button>
    </div>
  );
}
