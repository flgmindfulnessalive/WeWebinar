import "server-only";

// Thin wrapper over Vercel's Domains API -- registers a customer's
// hostname on this project so Vercel can verify DNS ownership and issue
// the TLS certificate automatically. Requires VERCEL_API_TOKEN and
// VERCEL_PROJECT_ID to be set (VERCEL_TEAM_ID only if the project lives
// under a team); every function below no-ops to a clear "not_configured"
// result rather than throwing when they're missing, so a deployment that
// hasn't set these up yet degrades to "domain saved, not yet reachable"
// instead of crashing the settings page.
const VERCEL_API_BASE = "https://api.vercel.com";

function vercelConfigured(): boolean {
  return Boolean(process.env.VERCEL_API_TOKEN && process.env.VERCEL_PROJECT_ID);
}

function teamQuery(): string {
  return process.env.VERCEL_TEAM_ID
    ? `?teamId=${encodeURIComponent(process.env.VERCEL_TEAM_ID)}`
    : "";
}

async function vercelFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${VERCEL_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

export type VercelResult = { ok: true } | { ok: false; error: string };

// Idempotent: calling it again for a domain already on this project is
// treated as success, not an error -- the caller (verifyCustomDomain)
// re-registers on every check to recover from a domain that was added but
// never finished DNS propagation.
export async function registerVercelDomain(hostname: string): Promise<VercelResult> {
  if (!vercelConfigured()) return { ok: false, error: "not_configured" };

  const res = await vercelFetch(`/v10/projects/${process.env.VERCEL_PROJECT_ID}/domains${teamQuery()}`, {
    method: "POST",
    body: JSON.stringify({ name: hostname }),
  });
  if (res.ok) return { ok: true };

  const body: { error?: { code?: string; message?: string } } | null = await res.json().catch(() => null);
  if (res.status === 409 && body?.error?.code === "domain_already_in_use") {
    return { ok: true };
  }
  return { ok: false, error: body?.error?.message ?? `vercel_http_${res.status}` };
}

export type VercelDomainStatus = { verified: true } | { verified: false; reason: string };

export async function checkVercelDomainStatus(hostname: string): Promise<VercelDomainStatus> {
  if (!vercelConfigured()) return { verified: false, reason: "not_configured" };

  const res = await vercelFetch(
    `/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${encodeURIComponent(hostname)}${teamQuery()}`
  );
  if (!res.ok) return { verified: false, reason: `vercel_http_${res.status}` };

  const body: {
    verified?: boolean;
    verification?: { type: string; domain: string; value: string }[];
  } = await res.json();

  if (body.verified) return { verified: true };

  const challenge = body.verification?.[0];
  const reason = challenge
    ? `${challenge.type} ${challenge.domain} = ${challenge.value}`
    : "dns_not_propagated";
  return { verified: false, reason };
}

export async function removeVercelDomain(hostname: string): Promise<void> {
  if (!vercelConfigured()) return;
  await vercelFetch(
    `/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${encodeURIComponent(hostname)}${teamQuery()}`,
    { method: "DELETE" }
  );
}
