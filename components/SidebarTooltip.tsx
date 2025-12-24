"use client";

import { ReactNode, useState } from "react";

export default function SidebarTooltip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const [show, setShow] = useState(false);

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}

      {show && (
        <div
          className="
            absolute left-full top-1/2 -translate-y-1/2 ml-3
            whitespace-nowrap rounded-md bg-gray-900 text-white text-xs px-2 py-1
            shadow-lg z-50
            opacity-100 translate-x-0
            transition-all duration-200
          "
        >
          {label}
        </div>
      )}
    </div>
  );
}
