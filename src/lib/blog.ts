import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import "server-only";

import { routing } from "@/i18n/routing";

type Locale = (typeof routing.locales)[number];

const CONTENT_DIR = path.join(process.cwd(), "content", "blog");

export type BlogFrontmatter = {
  title: string;
  description: string;
  date: string;
  // Shared key linking a post to its translation in the other locale --
  // slugs themselves are never assumed to match across locales (a real
  // Spanish and English slug for the same post are almost never the same
  // string). Optional: a post with no counterpart yet just gets no
  // hreflang alternate for the other locale.
  translationKey?: string;
};

export type BlogPost = BlogFrontmatter & {
  slug: string;
  locale: Locale;
  content: string;
};

function localeDir(locale: Locale): string {
  return path.join(CONTENT_DIR, locale);
}

function readFrontmatter(locale: Locale, slug: string): BlogFrontmatter | null {
  const filePath = path.join(localeDir(locale), `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;
  const { data } = matter(fs.readFileSync(filePath, "utf8"));
  return data as BlogFrontmatter;
}

export function getAllSlugs(locale: Locale): string[] {
  const dir = localeDir(locale);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(/\.mdx$/, ""));
}

export function getPost(locale: Locale, slug: string): BlogPost | null {
  const filePath = path.join(localeDir(locale), `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;
  const { data, content } = matter(fs.readFileSync(filePath, "utf8"));
  return { ...(data as BlogFrontmatter), slug, locale, content };
}

export function getAllPosts(locale: Locale): (BlogFrontmatter & { slug: string })[] {
  return getAllSlugs(locale)
    .map((slug) => {
      const frontmatter = readFrontmatter(locale, slug);
      return frontmatter ? { ...frontmatter, slug } : null;
    })
    .filter((post): post is BlogFrontmatter & { slug: string } => post !== null)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

// Finds the slug of the post in `targetLocale` sharing `translationKey`,
// for building this post's hreflang alternate in that locale. Returns
// null when no counterpart has been written yet.
export function findTranslationSlug(targetLocale: Locale, translationKey: string): string | null {
  const match = getAllSlugs(targetLocale).find((slug) => {
    const frontmatter = readFrontmatter(targetLocale, slug);
    return frontmatter?.translationKey === translationKey;
  });
  return match ?? null;
}
