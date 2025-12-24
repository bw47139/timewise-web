"use client";

export default function PayrollPunchRow({
  punch,
}: {
  punch: {
    type: "IN" | "OUT" | "BREAK_START" | "BREAK_END";
    time: string | null;
  };
}) {
  const isMissing = !punch.time;

  return (
    <div
      className={`flex justify-between px-12 py-1 text-xs ${
        isMissing ? "text-red-600 font-semibold" : "text-gray-700"
      }`}
    >
      <div>{punch.type.replace("_", " ")}</div>
      <div>{punch.time ?? "MISSING"}</div>
    </div>
  );
}
