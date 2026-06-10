import { ReactNode, useState } from "react";
import AnchoredPopover from "./AnchoredPopover";

export default function DropdownMenu({
  trigger,
  children,
  className = "",
}: {
  trigger: (args: { open: boolean; toggle: () => void }) => ReactNode;
  children: (args: { close: () => void }) => ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <AnchoredPopover
      open={open}
      onOpenChange={setOpen}
      className={`dropdown-menu ${className}`.trim()}
      contentClassName="dropdown-menu-content popover-panel popover-size-md"
      trigger={({ open, toggle }) => trigger({ open, toggle })}
    >
      {children}
    </AnchoredPopover>
  );
}
