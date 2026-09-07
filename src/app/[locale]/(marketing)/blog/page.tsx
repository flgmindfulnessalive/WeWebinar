import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getAllPosts } from "@/lib/blog";
import { localeAlternates } from "@/lib/seo";

type Locale = (typeof routing.locales)[number];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Blog" });
  const title = t("metaTitle");
  const description = t("metaDescription");
  return {
    title,
    description,
    alternates: localeAlternates("/blog", locale),
    openGraph: { title, description },
    twitter: { title, description },
  };
}

export default async function BlogIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("Blog");
  const posts = getAllPosts(locale as Locale);

  return (
    <div className="marketing-theme mx-auto flex max-w-3xl flex-col gap-10 px-6 py-16 sm:py-24">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      </div>

      {posts.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">{t("emptyState")}</p>
      ) : (
        <div className="flex flex-col divide-y">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col gap-1.5 py-6"
            >
              <span className="text-xs text-muted-foreground">
                {new Date(post.date).toLocaleDateString(locale)}
              </span>
              <h2 className="text-lg font-medium transition-colors group-hover:text-[var(--brand)]">
                {post.title}
              </h2>
              <p className="text-sm text-muted-foreground">{post.description}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
