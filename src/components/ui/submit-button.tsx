"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonStyle } from "@/components/ui/button";

type Props = ComponentProps<"button"> &
  ButtonStyle & {
    // Ask "Are you sure?" first, for actions that are hard to undo.
    confirm?: string;
    // Shown while the form is being sent, e.g. "Saving...".
    pendingText?: string;
  };

// A form's submit button. It is disabled while the form is being sent, so a double click
// can't submit twice, and can ask for confirmation first.
export function SubmitButton({
  confirm,
  pendingText,
  children,
  onClick,
  disabled,
  ...props
}: Props) {
  const { pending } = useFormStatus();

  return (
    <Button
      {...props}
      type="submit"
      disabled={pending || disabled}
      onClick={(event) => {
        if (confirm && !window.confirm(confirm)) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
    >
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}
