import { calcGrossPay, money } from "./payrollMath";

type EmployeeRow = {
  employeeId: number;
  name: string;
  rate?: number;

  regularHours: number;
  overtimeHours: number;
  doubletimeHours: number;
  ptoHours: number;
};

export default function PayrollEmployeeTable({
  employees,
}: {
  employees: EmployeeRow[];
}) {
  return (
    <div className="bg-white rounded shadow overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Employee</th>
            <th className="p-2">Rate</th>
            <th className="p-2">Reg</th>
            <th className="p-2">OT</th>
            <th className="p-2">DT</th>
            <th className="p-2">PTO</th>
            <th className="p-2 text-right">Gross Pay</th>
          </tr>
        </thead>

        <tbody>
          {employees.map((e) => {
            const pay = calcGrossPay({
              regularHours: e.regularHours,
              overtimeHours: e.overtimeHours,
              doubletimeHours: e.doubletimeHours,
              ptoHours: e.ptoHours,
              rate: e.rate ?? 0,
            });

            return (
              <tr key={e.employeeId} className="border-t">
                <td className="p-2">{e.name}</td>
                <td className="p-2 text-center">
                  {money(e.rate)}
                </td>
                <td className="p-2 text-center">
                  {e.regularHours}
                </td>
                <td className="p-2 text-center">
                  {e.overtimeHours}
                </td>
                <td className="p-2 text-center">
                  {e.doubletimeHours}
                </td>
                <td className="p-2 text-center">
                  {e.ptoHours}
                </td>
                <td className="p-2 text-right font-semibold">
                  {money(pay.grossPay)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
