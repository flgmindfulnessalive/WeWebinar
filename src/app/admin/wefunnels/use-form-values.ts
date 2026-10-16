"use client";

import { useState } from "react";

import type { ModerationState } from "@/lib/actions/admin-wefunnels";

/**
 * Campos controlados que sobreviven a un envío fallido.
 *
 * React 19 vacía los campos NO controlados en cuanto una acción de
 * formulario termina, y lo hace igual si terminó en error. En un
 * formulario de dos líneas eso se nota poco; en uno que lleva una
 * descripción larga o un guion de reel de seis mil caracteres, perderlo
 * entero porque sobraban veinte caracteres es inaceptable -- y es lo que
 * pasaba: el error salía y el texto ya no estaba.
 *
 * Se vacían solos al CREAR con éxito, que es cuando sí estorba lo que
 * quedó escrito. Al editar una fila existente no se tocan: el servidor
 * revalida y los valores que llegan ya son los guardados.
 */
export function useFormValues<T extends Record<string, string | boolean>>(
  initial: T,
  options: { clearOnSuccess: boolean; state: ModerationState }
) {
  const [values, setValues] = useState<T>(initial);
  const succeeded = Boolean(options.state && "success" in options.state);

  // Ajuste durante el render, no en un efecto. Es el patrón que React
  // recomienda cuando un estado tiene que seguir a otro valor que cambia
  // («You Might Not Need an Effect»): React vuelve a renderizar en el
  // acto, sin pintar el paso intermedio y sin la cascada que provoca
  // llamar a setState dentro de un efecto.
  const [wasDone, setWasDone] = useState(succeeded);
  if (succeeded !== wasDone) {
    setWasDone(succeeded);
    if (succeeded && options.clearOnSuccess) setValues(initial);
  }

  function text(name: keyof T & string) {
    return {
      name,
      value: String(values[name] ?? ""),
      onChange: (event: { target: { value: string } }) =>
        setValues((current) => ({ ...current, [name]: event.target.value })),
    };
  }

  function check(name: keyof T & string) {
    return {
      name,
      checked: Boolean(values[name]),
      onChange: (event: { target: { checked: boolean } }) =>
        setValues((current) => ({ ...current, [name]: event.target.checked })),
    };
  }

  return { text, check };
}
