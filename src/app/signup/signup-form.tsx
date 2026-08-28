"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail } from "lucide-react";

import { signUpWithPassword } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GoogleButton } from "@/components/google-button";

const CHECK_EMAIL_REDIRECT_MS = 15_000;

export function SignupForm({ initialEmail }: { initialEmail?: string }) {
  const [state, formAction, isPending] = useActionState(
    signUpWithPassword,
    null
  );
  const router = useRouter();
  const showCheckEmail = Boolean(state && "checkEmail" in state);

  useEffect(() => {
    if (!showCheckEmail) return;
    const timer = setTimeout(() => router.push("/login"), CHECK_EMAIL_REDIRECT_MS);
    return () => clearTimeout(timer);
  }, [showCheckEmail, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crea tu cuenta</CardTitle>
        <CardDescription>
          Empieza a crear webinars evergreen en minutos.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {showCheckEmail ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <Mail className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">Revisa tu correo</p>
            <p className="text-sm text-muted-foreground">
              Te enviamos un link para confirmar tu cuenta. Haz clic ahí para continuar.
            </p>
            <p className="text-xs text-muted-foreground">
              Te llevamos a Ingresar en unos segundos, o{" "}
              <Link href="/login" className="underline underline-offset-4">
                hazlo ahora
              </Link>
              .
            </p>
          </div>
        ) : (
          <>
            <GoogleButton next="/onboarding" />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">o con email</span>
              </div>
            </div>

            <form action={formAction} className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="full_name">Nombre</Label>
                <Input id="full_name" name="full_name" type="text" required autoComplete="name" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  defaultValue={initialEmail}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <PasswordInput
                  id="password"
                  name="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              {state && "error" in state && (
                <p className="text-sm text-destructive">{state.error}</p>
              )}
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Creando cuenta..." : "Crear cuenta"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="underline underline-offset-4">
                Ingresa
              </Link>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
