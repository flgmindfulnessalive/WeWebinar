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

export function LeadCaptureGate({
  previewPercentage,
  onSubmit,
  onAnticipationRevealed,
  submitting,
  error,
}: {
  previewPercentage: number;
  onSubmit: (lead: LeadFormValues, honeypot: string) => void;
  onAnticipationRevealed: () => void;
  submitting: boolean;
  error: "rate_limited" | "generic" | null;
}) {
  const t = useTranslations("Readiness");
  const [revealed, setRevealed] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  // Honeypot: nunca visible ni alcanzable por teclado -- un humano jamás
  // lo completa, un bot que rellena todos los campos del form sí.
  const [website, setWebsite] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; consent?: string }>({});

  function handleReveal() {
    setRevealed(true);
    onAnticipationRevealed();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const errors: typeof fieldErrors = {};
    if (name.trim().length < 2) errors.name = t("leadForm.errorName");
    if (!EMAIL_RE.test(email.trim())) errors.email = t("leadForm.errorEmail");
    if (!consentGiven) errors.consent = t("leadForm.errorConsent");
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    onSubmit({ name: name.trim(), email: email.trim(), marketingConsent }, website);
  }

  if (!revealed) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6 px-6 py-16 text-center">
        <div
          className="flex size-32 items-center justify-center rounded-full motion-safe:animate-pulse"
          style={{ background: `conic-gradient(var(--brand) ${previewPercentage}%, var(--muted) 0)` }}
        >
          <div className="flex size-24 items-center justify-center rounded-full bg-background">
            <span aria-hidden className="text-3xl font-semibold text-muted-foreground blur-[3px] select-none">
              {previewPercentage}%
            </span>
          </div>
        </div>
        <h2 className="text-2xl font-semibold">{t("anticipation.title")}</h2>
        <p className="text-muted-foreground">{t("anticipation.subtitle")}</p>
        <Button
          size="lg"
          onClick={handleReveal}
          className="h-12 px-8 text-base text-white shadow-sm"
          style={{ background: BRAND_GRADIENT }}
        >
          {t("anticipation.cta")}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold">{t("leadForm.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("leadForm.description")}</p>

          <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="readiness-name">{t("leadForm.nameLabel")}</Label>
              <Input
                id="readiness-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("leadForm.namePlaceholder")}
                autoComplete="name"
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? "readiness-name-error" : undefined}
              />
              {fieldErrors.name && (
                <p id="readiness-name-error" className="text-xs text-destructive">
                  {fieldErrors.name}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="readiness-email">{t("leadForm.emailLabel")}</Label>
              <Input
                id="readiness-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("leadForm.emailPlaceholder")}
                autoComplete="email"
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "readiness-email-error" : undefined}
              />
              {fieldErrors.email && (
                <p id="readiness-email-error" className="text-xs text-destructive">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Honeypot silencioso: oculto visualmente, fuera del orden de
                tabulación y sin autocompletar -- ver /api/readiness/submit,
                que descarta el envío en silencio si esto llega no-vacío. */}
            <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
              <label htmlFor="readiness-website">Website</label>
              <input
                id="readiness-website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <p className="text-xs text-muted-foreground">{t("leadForm.privacyNote")}</p>

            <div>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]"
                  aria-describedby={fieldErrors.consent ? "readiness-consent-error" : undefined}
                />
                <span>{t("leadForm.consentLabel")}</span>
              </label>
              {fieldErrors.consent && (
                <p id="readiness-consent-error" className="mt-1 text-xs text-destructive">
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
              <span>{t("leadForm.marketingConsentLabel")}</span>
            </label>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error === "rate_limited" ? t("leadForm.errorRateLimited") : t("leadForm.errorGeneric")}
              </p>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="text-white shadow-sm"
              style={{ background: BRAND_GRADIENT }}
            >
              {submitting ? t("leadForm.submitting") : t("leadForm.submit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
