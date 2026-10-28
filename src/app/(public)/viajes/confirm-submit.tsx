"use client";

import { Button } from "@/components/ui";

/** Botón de envío que pide confirmación antes de una acción que no se puede deshacer desde acá. */
export function ConfirmSubmit({ message, children }: { message: string; children: React.ReactNode }) {
  return (
    <Button
      type="submit"
      variant="secondary"
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </Button>
  );
}
