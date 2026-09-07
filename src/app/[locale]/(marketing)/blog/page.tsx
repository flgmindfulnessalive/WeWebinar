import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { getPathname } from "@/i18n/navigation";
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

function formatDate(date: string, locale: string) {
  return new Date(date).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
}

export default async function BlogIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("Blog");
  const posts = getAllPosts(locale as Locale);
  const [featured, ...rest] = posts;

  return (
    <div className="marketing-theme relative">
      <div className="bg-grid-pattern absolute inset-x-0 top-0 -z-10 h-80 [mask-image:linear-gradient(to_bottom,black,transparent)]" />

      <div className="mx-auto flex max-w-5xl flex-col gap-14 px-6 py-16 sm:py-24">
        <div className="text-center">
          <div
            className="mx-auto inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
            style={{ borderColor: "var(--brand)", color: "var(--brand)" }}
          >
            {t("navLabel")}
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
        </div>

        {!featured ? (
          <p className="text-center text-sm text-muted-foreground">{t("emptyState")}</p>
        ) : (
          <div className="flex flex-col gap-14">
            <div>
              <p className="mb-4 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {t("latestLabel")}
              </p>
              <Link
                href={`/blog/${featured.slug}`}
                className="group grid gap-6 overflow-hidden rounded-2xl border bg-card transition-all hover:-translate-y-1 hover:shadow-xl sm:grid-cols-2"
              >
                <div className="aspect-video overflow-hidden sm:aspect-auto">
                  <img
                    src={getPathname({ href: `/blog/${featured.slug}/cover`, locale })}
                    alt=""
                    width={1200}
                    height={630}
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-col justify-center gap-3 p-6 sm:p-8">
                  <span className="text-xs text-muted-foreground">{formatDate(featured.date, locale)}</span>
                  <h2 className="text-2xl font-semibold tracking-tight text-balance transition-colors group-hover:text-[var(--brand)]">
                    {featured.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">{featured.description}</p>
                </div>
              </Link>
            </div>

            {rest.length > 0 && (
              <div>
                <p className="mb-4 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {t("moreLabel")}
                </p>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((post) => (
                    <Link
                      key={post.slug}
                      href={`/blog/${post.slug}`}
                      className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-all hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div className="aspect-video overflow-hidden">
                        <img
                          src={getPathname({ href: `/blog/${post.slug}/cover`, locale })}
                          alt=""
                          width={1200}
                          height={630}
                          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className="flex flex-1 flex-col gap-2 p-5">
                        <span className="text-xs text-muted-foreground">{formatDate(post.date, locale)}</span>
                        <h3 className="font-medium transition-colors group-hover:text-[var(--brand)]">
                          {post.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">{post.description}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
