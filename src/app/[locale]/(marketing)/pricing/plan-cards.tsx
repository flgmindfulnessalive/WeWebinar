"use client";

import { useState } from "react";
import NextLink from "next/link";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Database, Json } from "@/lib/supabase/database.types";

type Plan = Database["public"]["Tables"]["plans"]["Row"];
type Translate = (key: string, values?: Record<string, string | number>) => string;

function featureList(
  plan: {
    max_active_webinars: number | null;
    max_users: number | null;
    max_attendees_per_webinar: number | null;
    max_registrants_per_month: number | null;
    features: Json;
  },
  t: Translate
): string[] {
  const features = (plan.features as Record<string, boolean> | null) ?? {};
  const items = [
    plan.max_active_webinars
      ? t("features.activeWebinars", { count: plan.max_active_webinars })
      : t("features.activeWebinarsCustom"),
    plan.max_users ? t("features.users", { count: plan.max_users }) : t("features.usersCustom"),
    plan.max_attendees_per_webinar
      ? t("features.attendees", { count: plan.max_attendees_per_webinar })
      : t("features.attendeesCustom"),
    plan.max_registrants_per_month
      ? t("features.monthlyRegistrants", { count: plan.max_registrants_per_month })
      : t("features.monthlyRegistrantsCustom"),
    t("features.analytics"),
  ];
  if (features.ai_chat_replies) items.push(t("features.aiChatReplies"));
  if (features.integrations) items.push(t("features.integrations"));
  if (features.remove_branding) items.push(t("features.removeBranding"));
  if (features.custom_domain) items.push(t("features.customDomain"));
  // Always last, in every plan, so the three cards line up bullet-for-bullet.
  items.push(t("features.commercialRights"));
  return items;
}

export function PlanCards({ plans }: { plans: Plan[] }) {
  const [billing, setBilling] = useState<"annual" | "monthly">("annual");
  const t = useTranslations("Pricing");

  return (
    <div className="flex flex-col gap-6">
      <div className="mx-auto flex items-center gap-1 rounded-full border p-1 text-sm">
        <button
          type="button"
          onClick={() => setBilling("annual")}
          className={cn(
            "rounded-full px-4 py-1.5 font-medium transition-colors",
            billing === "annual" ? "text-white" : "text-muted-foreground"
          )}
          style={billing === "annual" ? { background: "var(--brand)" } : undefined}
        >
          {t("billingAnnual")}
        </button>
        <button
          type="button"
          onClick={() => setBilling("monthly")}
          className={cn(
            "rounded-full px-4 py-1.5 font-medium transition-colors",
            billing === "monthly" ? "text-white" : "text-muted-foreground"
          )}
          style={billing === "monthly" ? { background: "var(--brand)" } : undefined}
        >
          {t("billingMonthly")}
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {plans.map((plan) => {
          const featured = plan.key === "pro";
          const price = billing === "annual" ? plan.price_annual_usd : plan.price_monthly_usd;
          const unit = billing === "annual" ? t("perYear") : t("perMonth");

          return (
            <Card
              key={plan.id}
              className={cn(
                "relative transition-transform hover:-translate-y-1",
                featured && "shadow-lg"
              )}
              style={featured ? { borderColor: "var(--brand)", borderWidth: 2 } : undefined}
            >
              {featured && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-medium text-white"
                  style={{ background: "linear-gradient(90deg, var(--brand), var(--brand-2))" }}
                >
                  {t("mostPopular")}
                </span>
              )}
              <CardHeader>
                <CardTitle className="text-xl capitalize">{plan.name}</CardTitle>
                <CardDescription>
                  {price === null ? (
                    <span className="text-2xl font-semibold text-foreground">{t("custom")}</span>
                  ) : (
                    <>
                      <span className="text-2xl font-semibold text-foreground">${price}</span>{" "}
                      / {unit}
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2 text-sm">
                  {featureList(plan, t).map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="size-4 shrink-0" style={{ color: "var(--brand)" }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  asChild
                  className={featured ? "w-full text-white" : "w-full"}
                  style={featured ? { background: "var(--brand)" } : undefined}
                >
                  <NextLink href={`/signup?plan=${plan.key}`}>
                    {t("getStarted", { plan: plan.name })}
                  </NextLink>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
