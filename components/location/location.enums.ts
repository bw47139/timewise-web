// components/location/location.enums.ts

export enum PayPeriodType {
  WEEKLY = "WEEKLY",
  BIWEEKLY = "BIWEEKLY",
  SEMIMONTHLY = "SEMIMONTHLY",
  MONTHLY = "MONTHLY",
}

export const PAY_PERIOD_LABELS: Record<PayPeriodType, string> = {
  WEEKLY: "Weekly",
  BIWEEKLY: "Bi-Weekly",
  SEMIMONTHLY: "Semi-Monthly",
  MONTHLY: "Monthly",
};

export const WEEK_START_DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
];
