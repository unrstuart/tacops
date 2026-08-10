import type { ReactNode } from "react";

export function IconRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">{children}</div>;
}
