"use client";

import { useActionState } from "react";

import { inviteMember } from "@/lib/actions/team";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function InviteForm() {
  const [state, formAction, isPending] = useActionState(inviteMember, null);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="invite-email">Email</Label>
        <Input id="invite-email" name="email" type="email" required className="w-64" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="invite-role">Rol</Label>
        <select
          id="invite-role"
          name="role"
          defaultValue="editor"
          className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <option value="editor">Editor</option>
          <option value="viewer">Viewer</option>
        </select>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Invitando..." : "Invitar"}
      </Button>
      {state?.error && (
        <p className="w-full text-sm text-destructive">{state.error}</p>
      )}
    </form>
  );
}
