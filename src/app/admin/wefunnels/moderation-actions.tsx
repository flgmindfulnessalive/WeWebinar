"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  clearReview,
  mountMissingCourseRooms,
  setSiteSuspended,
  type ModerationState,
  type MountRoomsState,
} from "@/lib/actions/admin-wefunnels";
import { Button } from "@/components/ui/button";

function Pending({
  children,
  variant,
}: {
  children: string;
  variant?: "destructive" | "outline";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant={variant} disabled={pending}>
      {pending ? "…" : children}
    </Button>
  );
}

export function SuspendButton({
  siteId,
  suspended,
  rule,
}: {
  siteId: string;
  suspended: boolean;
  rule?: string;
}) {
  const [state, action] = useActionState<ModerationState, FormData>(setSiteSuspended, null);

  return (
    <form action={action} className="inline-flex items-center gap-2">
      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="suspended" value={suspended ? "false" : "true"} />
      {rule && <input type="hidden" name="rule" value={rule} />}
      <Pending variant={suspended ? "outline" : "destructive"}>
        {suspended ? "Restituir" : "Bajar página"}
      </Pending>
      {state && "error" in state && (
        <span role="alert" className="text-xs text-destructive">
          {state.error}
        </span>
      )}
    </form>
  );
}

export function ClearButton({ reviewId }: { reviewId: string }) {
  const [state, action] = useActionState<ModerationState, FormData>(clearReview, null);

  return (
    <form action={action} className="inline-flex items-center gap-2">
      <input type="hidden" name="reviewId" value={reviewId} />
      <Pending variant="outline">Está bien</Pending>
      {state && "error" in state && (
        <span role="alert" className="text-xs text-destructive">
          {state.error}
        </span>
      )}
    </form>
  );
}

// The one-pass repair for distributors who bought before the course was
// recorded. Nothing calls it on a schedule on purpose: it is a response to
// an event a person knows about (the course going live, the template id
// being filled in), not a background job.
export function MountCourseRoomsButton() {
  const [state, action] = useActionState<MountRoomsState, FormData>(
    mountMissingCourseRooms,
    null
  );

  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <Pending variant="outline">Montar salas pendientes</Pending>
      {state && "error" in state && (
        <span role="alert" className="text-xs text-destructive">
          {state.error}
        </span>
      )}
      {state && "mounted" in state && (
        <span className="text-xs text-muted-foreground">
          {state.mounted === 0
            ? "No había ninguna pendiente."
            : `${state.mounted} sala${state.mounted === 1 ? "" : "s"} montada${state.mounted === 1 ? "" : "s"}.`}
        </span>
      )}
    </form>
  );
}
