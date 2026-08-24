import Link from "next/link";

import { Logo } from "@/components/logo";
import { ParticleNetwork } from "@/components/particle-network";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="grid min-h-svh md:grid-cols-2">
      <div className="relative hidden items-center justify-center overflow-hidden bg-[#0b0f19] md:flex">
        <ParticleNetwork />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b0f19] via-transparent to-transparent" />
        {/* pointer-events-none: none of this is interactive, and blocking
            pointer events here would leave a dead zone in the middle of
            the panel where the particle network stops reacting to the
            mouse. */}
        <div className="pointer-events-none relative z-10 flex flex-col items-center gap-4 px-10 text-center">
          <Logo className="size-16 rounded-2xl text-2xl shadow-2xl shadow-indigo-500/30" />
          <span className="text-2xl font-semibold tracking-tight text-white">WeWebinar</span>
          <p className="max-w-xs text-sm text-white/60">
            Webinars evergreen que se sienten en vivo.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-8 p-6">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <Link
            href="/"
            className="flex items-center gap-2 self-center text-lg font-semibold tracking-tight md:hidden"
          >
            <Logo />
            WeWebinar
          </Link>
          <LoginForm next={next ?? "/dashboard"} />
        </div>
      </div>
    </div>
  );
}
