import type { JSX } from "react";
import * as Flags from "country-flag-icons/react/3x2";

type FlagComponent = (props: { className?: string; title?: string }) => JSX.Element;

const FLAGS = Flags as unknown as Record<string, FlagComponent>;

export function Flag({ iso2, className }: { iso2: string; className?: string }) {
  const Component = FLAGS[iso2.toUpperCase()];
  if (!Component) {
    return <span className={`inline-block bg-stone-200 ${className ?? ""}`} aria-hidden />;
  }
  return <Component className={className} />;
}
