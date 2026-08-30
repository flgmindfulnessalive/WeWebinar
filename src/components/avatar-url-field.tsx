"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Upload } from "lucide-react";

import { uploadAvatar } from "@/lib/actions/uploads";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// A URL text input plus a JPG/PNG upload button, both writing to the same
// underlying field -- not everyone hosting a photo has a URL for it handy.
// Calls the upload server action directly (not through a <form action>),
// since this field always lives inside another, larger form and forms
// can't nest.
export function AvatarUrlField({
  id,
  name,
  defaultValue,
}: {
  id: string;
  name: string;
  defaultValue: string | null;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations("AvatarUpload");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadAvatar(formData);
      if ("error" in result) {
        setError(result.error);
      } else {
        setValue(result.url);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <Input
          id={id}
          name={name}
          type="url"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://..."
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {t("uploadFile")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t("fileHint")}</p>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
