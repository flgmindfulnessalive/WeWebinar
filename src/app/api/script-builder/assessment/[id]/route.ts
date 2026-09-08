import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";

const IdSchema = z.uuid();

// Escenario A del brief: /script-builder?assessment_id=... llega con el
// mismo id (client-generated UUID) que readiness_assessments.id -- mismo
// modelo de confianza que registrants.access_token (capability token, no
// hace falta sesión). Devuelve solo el subconjunto autorizado para
// precargar el wizard: nunca la respuesta completa de las 30 preguntas.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsedId = IdSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: assessment } = await admin
    .from("readiness_assessments")
    .select("id, name, email, business_type, score_percentage, weakest_category")
    .eq("id", parsedId.data)
    .maybeSingle();

  if (!assessment) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    assessmentId: assessment.id,
    leadName: assessment.name,
    leadEmail: assessment.email,
    businessType: assessment.business_type,
    readinessScore: assessment.score_percentage,
    weakestCategory: assessment.weakest_category,
  });
}
