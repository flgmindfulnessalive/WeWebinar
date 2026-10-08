import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

// "Activar Distribuidor · $199" on the official website lands here. A
// signed-in person goes straight to the activation screen in their panel
// (the server decides their price there); anyone else creates an account
// first, with the intent recorded so the panel knows what they came for.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const destination = user ? "/panel/distribuidor" : "/wefunnels/registro?plan=distribuidor";
  return NextResponse.redirect(new URL(destination, request.url));
}
