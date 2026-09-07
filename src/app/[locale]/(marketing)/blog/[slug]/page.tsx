import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MDXRemote } from "next-mdx-remote/rsc";

import { getPathname, Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { findTranslationSlug, getAllSlugs, getPost, readingTimeMinutes } from "@/lib/blog";
import { localeAlternatesForPaths } from "@/lib/seo";
import { ShareButtons } from "../share-buttons";

type Locale = (typeof routing.locales)[number];

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://wewebinars.com";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    getAllSlugs(locale).map((slug) => ({ locale, slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = getPost(locale as Locale, slug);
  if (!post) return {};

  // Cross-locale hreflang only for locales that actually have a
  // translation on file (matched via the post's translationKey) --
  // pointing at a slug that doesn't exist would be worse than omitting
  // the alternate entirely.
  const pathsByLocale: Partial<Record<string, string>> = { [locale]: `/blog/${slug}` };
  if (post.translationKey) {
    for (const l of routing.locales) {
      if (l === locale) continue;
      const translatedSlug = findTranslationSlug(l, post.translationKey);
      if (translatedSlug) pathsByLocale[l] = `/blog/${translatedSlug}`;
    }
  }

  const image = { url: `/blog/${slug}/cover`, width: 1200, height: 630 };
  return {
    title: post.title,
    description: post.description,
    alternates: localeAlternatesForPaths(locale, pathsByLocale),
    openGraph: { title: post.title, description: post.description, type: "article", images: [image] },
    twitter: { title: post.title, description: post.description, images: [image] },
  };
}

function formatDate(date: string, locale: string) {
  return new Date(date).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const post = getPost(locale as Locale, slug);
  if (!post) notFound();

  const t = await getTranslations("Blog");
  const coverSrc = getPathname({ href: `/blog/${slug}/cover`, locale });
  const postUrl = `${SITE_URL}${getPathname({ href: `/blog/${slug}`, locale })}`;
  const minutes = readingTimeMinutes(post.content);

  const shareLabels = {
    x: t("shareOnX"),
    linkedin: t("shareOnLinkedin"),
    facebook: t("shareOnFacebook"),
    whatsapp: t("shareOnWhatsapp"),
    copy: t("copyLink"),
    copied: t("linkCopied"),
  };

  return (
    <article className="marketing-theme mx-auto flex max-w-2xl flex-col gap-8 px-6 py-16 sm:py-24">
      <div>
        <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground">
          {t("backToBlog")}
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {post.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span>{formatDate(post.date, locale)}</span>
          <span aria-hidden>·</span>
          <span>{t("minRead", { count: minutes })}</span>
        </div>
      </div>

      <img
        src={coverSrc}
        alt=""
        width={1200}
        height={630}
        className="aspect-video w-full rounded-xl border object-cover shadow-sm"
      />

      <div className="flex items-center justify-between border-y py-3">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t("share")}
        </span>
        <ShareButtons url={postUrl} title={post.title} labels={shareLabels} />
      </div>

      <div className="prose-blog">
        <MDXRemote source={post.content} />
      </div>

      <div className="flex items-center justify-between border-t pt-6">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t("share")}
        </span>
        <ShareButtons url={postUrl} title={post.title} labels={shareLabels} />
      </div>
    </article>
  );
}
