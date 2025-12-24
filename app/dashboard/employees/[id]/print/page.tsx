"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export default function EmployeePrintPage() {
  const params = useParams();
  const employeeId = Number((params as any).id);

  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function loadEmployee() {
    const res = await fetch(`${API_BASE}/api/employee/${employeeId}`, {
      credentials: "include",
    });
    const data = await res.json();
    setEmployee(data);
    setLoading(false);

    // Auto print after load
    setTimeout(() => {
      window.print();
    }, 800);
  }

  useEffect(() => {
    loadEmployee();
  }, [employeeId]);

  if (loading || !employee) {
    return <div className="p-6 text-lg">Loading…</div>;
  }

  return (
    <div className="p-10 text-black">
      {/* HEADER */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold">
          Employee Profile Report
        </h1>
        <p className="text-gray-600 text-sm">
          Generated on {new Date().toLocaleString()}
        </p>
      </div>

      {/* BASIC INFORMATION */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 border-b pb-1">
          Basic Information
        </h2>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <p><strong>Name:</strong> {employee.firstName} {employee.lastName}</p>
          <p><strong>Preferred:</strong> {employee.preferredName || "—"}</p>
          <p><strong>Email:</strong> {employee.email || "—"}</p>
          <p><strong>Status:</strong> {employee.status}</p>
        </div>
      </section>

      {/* CONTACT */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 border-b pb-1">
          Contact Details
        </h2>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <p><strong>Phone:</strong> {employee.phoneNumber || "—"}</p>
          <p><strong>Alternate:</strong> {employee.phoneAlt || "—"}</p>
        </div>
      </section>

      {/* ADDRESS */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 border-b pb-1">
          Address
        </h2>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <p><strong>Address Line 1:</strong> {employee.addressLine1 || "—"}</p>
          <p><strong>Address Line 2:</strong> {employee.addressLine2 || "—"}</p>
          <p><strong>City:</strong> {employee.city || "—"}</p>
          <p><strong>State:</strong> {employee.state || "—"}</p>
          <p><strong>Postal Code:</strong> {employee.postalCode || "—"}</p>
          <p><strong>Country:</strong> {employee.country || "—"}</p>
        </div>
      </section>

      {/* EMPLOYMENT */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 border-b pb-1">
          Employment Details
        </h2>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <p><strong>Job Title:</strong> {employee.jobTitle || "—"}</p>
          <p><strong>Department:</strong> {employee.department || "—"}</p>
          <p><strong>Hire Date:</strong> 
            {employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : "—"}
          </p>
        </div>
      </section>

      {/* PERSONAL */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 border-b pb-1">
          Personal Information
        </h2>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <p><strong>DOB:</strong> 
            {employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString() : "—"}
          </p>
          <p><strong>Gender:</strong> {employee.gender || "—"}</p>
          <p><strong>SSN:</strong> ****-**-{employee.ssnLast4 || "—"}</p>
          <p><strong>Marital Status:</strong> {employee.maritalStatus || "—"}</p>
        </div>
      </section>

      {/* EMERGENCY CONTACTS */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 border-b pb-1">
          Emergency Contacts
        </h2>

        {employee.emergencyContacts?.length === 0 ? (
          <p className="text-sm">No emergency contacts added.</p>
        ) : (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2">Name</th>
                <th className="border p-2">Phone</th>
                <th className="border p-2">Relation</th>
              </tr>
            </thead>
            <tbody>
              {employee.emergencyContacts.map((c: any) => (
                <tr key={c.id}>
                  <td className="border p-2">{c.name}</td>
                  <td className="border p-2">{c.phone}</td>
                  <td className="border p-2">{c.relation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* SIGNATURE AREA */}
      <section className="mt-12">
        <p className="text-sm text-gray-600">
          Employee Signature: _______________________________________________
        </p>
        <p className="mt-6 text-sm text-gray-600">
          Manager Signature: ________________________________________________
        </p>
      </section>
    </div>
  );
}
