import { getTranslations } from "next-intl/server";
import { ProductPreviewStage } from "./product-preview-stage";

// A stylized illustration of the live webinar room -- not a real
// screenshot (none exists to show), just an abstract mockup that
// communicates "video + live chat + a timed CTA" at a glance.
export async function ProductPreview() {
  const t = await getTranslations("ProductPreview");
  const chatMessages = [
    { name: "Vale M.", text: t("chat.message1") },
    { name: "Diego R.", text: t("chat.message2") },
    { name: "Sofía L.", text: t("chat.message3") },
  ];

  return (
    <ProductPreviewStage
      urlBar={t("urlBar")}
      live={t("live")}
      chatLabel={t("chatLabel")}
      offer={t("offer")}
      chatMessages={chatMessages}
    />
  );
}
