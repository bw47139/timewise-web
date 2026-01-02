"use client";

type Props = {
  summary: {
    totalRegular: number;
    totalOvertime: number;
    totalDoubletime: number;
    totalGross: number;
  };
  payPeriodId: number;
};

export default function PayrollSummaryCard({
  summary,
  payPeriodId,
}: Props) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h2 className="text-lg font-semibold">Payroll Summary</h2>
        <p className="text-sm text-gray-500">
          Pay Period ID: {payPeriodId}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex justify-between">
          <span>Regular Hours</span>
          <span className="font-medium">{summary.totalRegular}</span>
        </div>

        <div className="flex justify-between">
          <span>Overtime Hours</span>
          <span className="font-medium">{summary.totalOvertime}</span>
        </div>

        <div className="flex justify-between">
          <span>Doubletime Hours</span>
          <span className="font-medium">{summary.totalDoubletime}</span>
        </div>

        <div className="flex justify-between col-span-2 border-t pt-2 mt-1">
          <span className="font-semibold">Gross Pay</span>
          <span className="font-semibold">
            ${summary.totalGross.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
