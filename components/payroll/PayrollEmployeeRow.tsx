"use client";

interface Props {
  employee: any;
}

export default function PayrollEmployeeRow({ employee }: Props) {
  return (
    <tr className="border-b">
      <td className="px-2 py-1 text-sm">
        {employee?.name ?? "Employee"}
      </td>
      <td className="px-2 py-1 text-sm">
        {employee?.hours ?? 0}
      </td>
      <td className="px-2 py-1 text-sm">
        {employee?.grossPay ?? 0}
      </td>
    </tr>
  );
}
