import { ReactNode } from "react";
import { useClickOutside } from "../useClickOutside";

export default function AnchoredPopover({
  open,
  onOpenChange,
  trigger,
  children,
  className = "",
  contentClassName = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: (args: { open: boolean; toggle: () => void; close: () => void }) => ReactNode;
  children: (args: { close: () => void }) => ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const close = () => onOpenChange(false);
  const toggle = () => onOpenChange(!open);
  const ref = useClickOutside<HTMLDivElement>(open, close);

  return (
    <div className={`anchored-popover ${className}`.trim()} ref={ref}>
      {trigger({ open, toggle, close })}
      {open && (
        <div className={`anchored-popover-content ${contentClassName}`.trim()}>
          {children({ close })}
        </div>
      )}
    </div>
  );
}
