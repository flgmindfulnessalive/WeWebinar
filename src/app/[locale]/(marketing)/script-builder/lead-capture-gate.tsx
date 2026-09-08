"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BRAND_GRADIENT = "linear-gradient(90deg, var(--brand), var(--brand-2))";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type LeadFormValues = {
  name: string;
  email: string;
  marketingConsent: boolean;
};

// Precarga name/email cuando ya los conocemos (Escenario A: vinimos de un
// Readiness Score ya completado) -- nunca se saltea la pantalla, el
// consentimiento explícito (consentGiven) se pide siempre de nuevo, pero
// el usuario no tiene que re-tipear datos que ya dio.
export function LeadCaptureGate({
  prefillName,
  prefillEmail,
  onSubmit,
  submitting,
  error,
}: {
  prefillName?: string;
  prefillEmail?: string;
  onSubmit: (lead: LeadFormValues, honeypot: string) => void;
  submitting: boolean;
  error: "rate_limited" | "generic" | null;
}) {
  const t = useTranslations("ScriptBuilder.leadForm");
  const [name, setName] = useState(prefillName ?? "");
  const [email, setEmail] = useState(prefillEmail ?? "");
  const [consentGiven, setConsentGiven] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  // Honeypot: nunca visible ni alcanzable por teclado -- un humano jamás
  // lo completa, un bot que rellena todos los campos del form sí.
  const [website, setWebsite] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; consent?: string }>({});

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const errors: typeof fieldErrors = {};
    if (name.trim().length < 2) errors.name = t("errorName");
    if (!EMAIL_RE.test(email.trim())) errors.email = t("errorEmail");
    if (!consentGiven) errors.consent = t("errorConsent");
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    onSubmit({ name: name.trim(), email: email.trim(), marketingConsent }, website);
  }

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold">{t("title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>

          <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="script-builder-lead-name">{t("nameLabel")}</Label>
              <Input
                id="script-builder-lead-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
                autoComplete="name"
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? "script-builder-lead-name-error" : undefined}
              />
              {fieldErrors.name && (
                <p id="script-builder-lead-name-error" className="text-xs text-destructive">
                  {fieldErrors.name}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="script-builder-lead-email">{t("emailLabel")}</Label>
              <Input
                id="script-builder-lead-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
                autoComplete="email"
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "script-builder-lead-email-error" : undefined}
              />
              {fieldErrors.email && (
                <p id="script-builder-lead-email-error" className="text-xs text-destructive">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Honeypot silencioso -- ver /api/script-builder/save, que
                descarta el envío en silencio si esto llega no-vacío. */}
            <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
              <label htmlFor="script-builder-website">Website</label>
              <input
                id="script-builder-website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <p className="text-xs text-muted-foreground">{t("privacyNote")}</p>

            <div>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]"
                  aria-describedby={fieldErrors.consent ? "script-builder-lead-consent-error" : undefined}
                />
                <span>{t("consentLabel")}</span>
              </label>
              {fieldErrors.consent && (
                <p id="script-builder-lead-consent-error" className="mt-1 text-xs text-destructive">
                  {fieldErrors.consent}
                </p>
              )}
            </div>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]"
              />
              <span>{t("marketingConsentLabel")}</span>
            </label>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error === "rate_limited" ? t("errorRateLimited") : t("errorGeneric")}
              </p>
            )}

            <Button type="submit" disabled={submitting} className="text-white shadow-sm" style={{ background: BRAND_GRADIENT }}>
              {submitting ? t("submitting") : t("submit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
