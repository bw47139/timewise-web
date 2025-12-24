export function money(n: number | null | undefined) {
  return `$${(n ?? 0).toFixed(2)}`;
}

export function calcGrossPay({
  regularHours = 0,
  overtimeHours = 0,
  doubletimeHours = 0,
  ptoHours = 0,
  rate = 0,
  overtimeRate,
  doubletimeRate,
}: {
  regularHours?: number;
  overtimeHours?: number;
  doubletimeHours?: number;
  ptoHours?: number;
  rate?: number;
  overtimeRate?: number;
  doubletimeRate?: number;
}) {
  const otRate = overtimeRate ?? rate * 1.5;
  const dtRate = doubletimeRate ?? rate * 2;

  const regularPay = regularHours * rate;
  const overtimePay = overtimeHours * otRate;
  const doubletimePay = doubletimeHours * dtRate;
  const ptoPay = ptoHours * rate;

  return {
    regularPay,
    overtimePay,
    doubletimePay,
    ptoPay,
    grossPay:
      regularPay + overtimePay + doubletimePay + ptoPay,
  };
}
