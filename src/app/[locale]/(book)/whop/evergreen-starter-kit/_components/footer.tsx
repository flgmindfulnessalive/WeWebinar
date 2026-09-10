import { Logo } from "@/components/logo";
import { Link } from "@/i18n/navigation";

type FooterCopy = {
  tagline: string;
  poweredBy: string;
  rights: string;
};

export function Footer({ t }: { t: FooterCopy }) {
  return (
    <footer className="bg-[var(--skv-bg-deep)] py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 text-center">
        <Logo variant="mark" className="size-6 opacity-80" />
        <p className="max-w-sm text-sm text-white/40">{t.tagline}</p>
        <p className="text-xs text-white/30">
          {t.poweredBy}{" "}
          <Link href="/" className="underline underline-offset-4 hover:text-white/60">
            WeWebinars
          </Link>
        </p>
        <p className="text-xs text-white/25">{t.rights.replace("{year}", String(new Date().getFullYear()))}</p>
      </div>
    </footer>
  );
}
