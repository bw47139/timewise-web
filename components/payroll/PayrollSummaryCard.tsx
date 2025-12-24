import { money } from "./payrollMath";

type Props = {
  summary: {
    totalRegularHours: number;
    totalOvertimeHours: number;
    totalDoubletimeHours: number;
    totalPtoHours: number;
    totalGrossPay?: number;
  };
};

export default function PayrollSummaryCard({ summary }: Props) {
  return (
    <div className="bg-white rounded shadow p-4 grid grid-cols-5 gap-4">
      <Stat label="Regular Hours" value={summary.totalRegularHours} />
      <Stat label="OT Hours" value={summary.totalOvertimeHours} />
      <Stat label="DT Hours" value={summary.totalDoubletimeHours} />
      <Stat label="PTO Hours" value={summary.totalPtoHours} />
      <Stat
        label="Gross Payroll"
        value={money(summary.totalGrossPay)}
        bold
      />
    </div>
  );
}

function Stat({
  label,
  value,
  bold,
}: {
  label: string;
  value: any;
  bold?: boolean;
}) {
  return (
    <div>
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`text-xl ${bold ? "font-bold" : ""}`}>
        {value}
      </div>
    </div>
  );
}
