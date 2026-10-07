"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  clearReview,
  setSiteSuspended,
  type ModerationState,
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
