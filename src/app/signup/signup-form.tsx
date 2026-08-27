"use client";

import { useActionState } from "react";
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

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(
    signUpWithPassword,
    null
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crea tu cuenta</CardTitle>
        <CardDescription>
          Empieza a crear webinars evergreen en minutos.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {state && "checkEmail" in state ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <Mail className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">Revisa tu correo</p>
            <p className="text-sm text-muted-foreground">
              Te enviamos un link para confirmar tu cuenta. Hace clic ahí para continuar.
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
                <Input id="email" name="email" type="email" required autoComplete="email" />
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
