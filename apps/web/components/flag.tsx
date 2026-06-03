import type { JSX } from "react";
import US from "country-flag-icons/react/3x2/US";
import CN from "country-flag-icons/react/3x2/CN";
import IN from "country-flag-icons/react/3x2/IN";
import DE from "country-flag-icons/react/3x2/DE";
import BR from "country-flag-icons/react/3x2/BR";
import AR from "country-flag-icons/react/3x2/AR";

type FlagComponent = (props: { className?: string; title?: string }) => JSX.Element;

const FLAGS: Record<string, FlagComponent> = {
  US,
  CN,
  IN,
  DE,
  BR,
  AR
};

export function Flag({ iso2, className }: { iso2: string; className?: string }) {
  const Component = FLAGS[iso2.toUpperCase()];
  if (!Component) {
    return <span className={className} aria-hidden />;
  }
  return <Component className={className} />;
}
