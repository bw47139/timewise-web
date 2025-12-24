"use client";

type Props = {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
};

export default function NumericPad({
  value,
  onChange,
  onSubmit,
  disabled,
}: Props) {
  function press(num: string) {
    if (disabled) return;
    if (value.length >= 6) return; // max PIN length
    onChange(value + num);
  }

  function backspace() {
    if (disabled) return;
    onChange(value.slice(0, -1));
  }

  function clear() {
    if (disabled) return;
    onChange("");
  }

  const btn =
    "h-16 rounded-xl text-2xl font-bold bg-gray-800 hover:bg-gray-700 active:bg-gray-600";

  return (
    <div className="w-full max-w-md mx-auto mt-6">
      {/* PIN DISPLAY */}
      <div className="mb-4 p-4 text-center text-3xl tracking-widest bg-black text-green-400 rounded-lg border border-gray-600">
        {value.padEnd(6, "•")}
      </div>

      {/* KEYPAD */}
      <div className="grid grid-cols-3 gap-4">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
          <button key={n} className={btn} onClick={() => press(n)}>
            {n}
          </button>
        ))}

        <button
          className="h-16 rounded-xl text-lg font-semibold bg-red-700 hover:bg-red-600"
          onClick={clear}
        >
          CLEAR
        </button>

        <button className={btn} onClick={() => press("0")}>
          0
        </button>

        <button
          className="h-16 rounded-xl text-lg font-semibold bg-yellow-600 hover:bg-yellow-500"
          onClick={backspace}
        >
          ⌫
        </button>
      </div>

      {/* SUBMIT */}
      <button
        onClick={onSubmit}
        disabled={disabled || value.length === 0}
        className="mt-6 w-full py-4 rounded-xl text-xl font-bold bg-green-600 hover:bg-green-700 disabled:opacity-50"
      >
        SUBMIT PIN
      </button>
    </div>
  );
}
