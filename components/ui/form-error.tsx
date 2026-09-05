import { CircleAlert } from "lucide-react";

// Carries an icon as well as the colour, so it still reads as an error without relying on seeing red.
export function FormError({ message }: { message: string }): React.ReactElement {
  return (
    <p className="flex items-start gap-2 text-sm text-destructive">
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}
