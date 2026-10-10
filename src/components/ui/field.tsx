import type { ReactNode } from "react";

type Props = {
  label: string;
  htmlFor: string;
  // A short help text under the field.
  hint?: ReactNode;
  children: ReactNode;
};

// A labelled form field. Every form uses it, so labels, spacing and hints look the same.
export function Field({ label, htmlFor, hint, children }: Props) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-subtle-foreground">{hint}</p>}
    </div>
  );
}

// The result of submitting a form: an error in red, or a success message in green.
export function FormMessage({ error, success }: { error?: string; success?: string }) {
  if (error) {
    return (
      <p role="alert" className="text-sm text-danger">
        {error}
      </p>
    );
  }
  if (success) {
    return (
      <p role="status" className="text-sm text-success">
        {success}
      </p>
    );
  }
  return null;
}
