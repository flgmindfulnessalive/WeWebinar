import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MDXRemote } from "next-mdx-remote/rsc";

import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { findTranslationSlug, getAllSlugs, getPost } from "@/lib/blog";
import { localeAlternatesForPaths } from "@/lib/seo";

type Locale = (typeof routing.locales)[number];

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

  const image = { url: "/opengraph-image", width: 1200, height: 630 };
  return {
    title: post.title,
    description: post.description,
    alternates: localeAlternatesForPaths(locale, pathsByLocale),
    openGraph: { title: post.title, description: post.description, type: "article", images: [image] },
    twitter: { title: post.title, description: post.description, images: [image] },
  };
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

  return (
    <article className="marketing-theme mx-auto flex max-w-2xl flex-col gap-8 px-6 py-16 sm:py-24">
      <div>
        <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground">
          {t("backToBlog")}
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl text-balance">
          {post.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {new Date(post.date).toLocaleDateString(locale)}
        </p>
      </div>
      <div className="prose-blog">
        <MDXRemote source={post.content} />
      </div>
    </article>
  );
}
