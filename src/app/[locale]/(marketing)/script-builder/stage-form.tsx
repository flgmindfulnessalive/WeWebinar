"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { STAGE_KEYS, type StageKey } from "@/lib/script-builder/profile-config";
import type { ProofPoint, WebinarProjectProfile } from "@/lib/script-builder/types";
import { MultiSelectField } from "./multi-select-field";
import { NumberField } from "./number-field";
import { ProofPointsField } from "./proof-points-field";
import { ScriptBuilderProgress } from "./script-builder-progress";
import { SingleSelectField } from "./single-select-field";
import { STAGE_FIELD_CONFIG, isCritical, type FieldDescriptor } from "./stage-field-config";
import { StringListField } from "./string-list-field";
import { TextField } from "./text-field";
import { TextAreaField } from "./textarea-field";

function FieldRenderer({
  descriptor,
  profile,
  onFieldChange,
}: {
  descriptor: FieldDescriptor;
  profile: WebinarProjectProfile;
  onFieldChange: <K extends keyof WebinarProjectProfile>(key: K, value: WebinarProjectProfile[K]) => void;
}) {
  const t = useTranslations("ScriptBuilder.fields");
  const key = descriptor.key;
  const id = `script-builder-${key}`;
  const label = t(`${key}.label`);
  const placeholder = t.has(`${key}.placeholder`) ? t(`${key}.placeholder`) : undefined;
  const critical = isCritical(key);

  switch (descriptor.kind) {
    case "text":
      return (
        <TextField
          id={id}
          label={label}
          value={(profile[key] as string | undefined) ?? ""}
          onChange={(value) => onFieldChange(key, (value || undefined) as never)}
          placeholder={placeholder}
          type={descriptor.url ? "url" : "text"}
          critical={critical}
        />
      );
    case "textarea":
      return (
        <TextAreaField
          id={id}
          label={label}
          value={(profile[key] as string | undefined) ?? ""}
          onChange={(value) => onFieldChange(key, (value || undefined) as never)}
          placeholder={placeholder}
          critical={critical}
        />
      );
    case "number":
      if (descriptor.showIf && !descriptor.showIf(profile)) return null;
      return (
        <NumberField
          id={id}
          label={label}
          value={profile[key] as number | undefined}
          onChange={(value) => onFieldChange(key, value as never)}
          placeholder={placeholder}
          min={descriptor.min}
          max={descriptor.max}
        />
      );
    case "singleSelect":
      return (
        <SingleSelectField
          id={id}
          legend={label}
          options={descriptor.options}
          value={profile[key] as string | undefined}
          onSelect={(value) => onFieldChange(key, value as never)}
          optionLabel={(option) => t(`${key}.options.${option}`)}
          critical={critical}
          columns={descriptor.columns ?? 2}
        />
      );
    case "multiSelect":
      return (
        <MultiSelectField
          legend={label}
          options={descriptor.options}
          values={(profile[key] as string[] | undefined) ?? []}
          onToggle={(option) => {
            const current = (profile[key] as string[] | undefined) ?? [];
            const next = current.includes(option) ? current.filter((v) => v !== option) : [...current, option];
            onFieldChange(key, (next.length > 0 ? next : undefined) as never);
          }}
          optionLabel={(option) => t(`${key}.options.${option}`)}
          max={descriptor.max}
        />
      );
    case "stringList":
      return (
        <StringListField
          id={id}
          label={label}
          values={(profile[key] as string[] | undefined) ?? []}
          onChange={(values) => onFieldChange(key, (values.length > 0 ? values : undefined) as never)}
          placeholder={placeholder}
          max={descriptor.max}
        />
      );
    case "proofPoints":
      return (
        <ProofPointsField
          label={label}
          values={profile.proofPoints ?? []}
          onChange={(values: ProofPoint[]) => onFieldChange("proofPoints", (values.length > 0 ? values : undefined) as never)}
        />
      );
    default:
      return null;
  }
}

export function StageForm({
  stage,
  profile,
  onFieldChange,
  onContinue,
  onBack,
}: {
  stage: StageKey;
  profile: WebinarProjectProfile;
  onFieldChange: <K extends keyof WebinarProjectProfile>(key: K, value: WebinarProjectProfile[K]) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const t = useTranslations("ScriptBuilder.stages");
  const tNav = useTranslations("ScriptBuilder.nav");
  const stepNumber = STAGE_KEYS.indexOf(stage) + 1;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
      <ScriptBuilderProgress
        current={stepNumber}
        total={STAGE_KEYS.length}
        label={tNav("stepLabel", { current: stepNumber, total: STAGE_KEYS.length })}
      />

      <div>
        <h2 className="text-2xl font-semibold">{t(`${stage}.title`)}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t(`${stage}.description`)}</p>
      </div>

      <div className="flex flex-col gap-6">
        {STAGE_FIELD_CONFIG[stage].map((descriptor) => (
          <FieldRenderer key={descriptor.key} descriptor={descriptor} profile={profile} onFieldChange={onFieldChange} />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          {tNav("previous")}
        </Button>
        <Button
          onClick={onContinue}
          className="text-white shadow-sm"
          style={{ background: "linear-gradient(90deg, var(--brand), var(--brand-2))" }}
        >
          {tNav("continue")}
        </Button>
      </div>
    </div>
  );
}
