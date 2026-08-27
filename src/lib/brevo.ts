import "server-only";

// Upsert-and-list-add in one call: updateEnabled means an already-existing
// contact gets added to the list (and its name/phone refreshed) instead of
// this failing with a 400 "contact already exists" -- registrants can
// legitimately hit this endpoint more than once (re-registering, or a
// retried request).
export async function syncBrevoContact({
  apiKey,
  listId,
  email,
  name,
  phone,
}: {
  apiKey: string;
  listId: number;
  email: string;
  name: string;
  phone?: string | null;
}): Promise<void> {
  const [firstName, ...rest] = name.trim().split(/\s+/);
  const lastName = rest.join(" ");

  const res = await fetch("https://api.brevo.com/v3/contacts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      email,
      attributes: {
        FIRSTNAME: firstName || undefined,
        LASTNAME: lastName || undefined,
        SMS: phone || undefined,
      },
      listIds: [listId],
      updateEnabled: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Brevo API ${res.status}: ${body}`);
  }
}
