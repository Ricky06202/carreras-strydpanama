import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { registrationSchema, createRegistration, RegError } from "@/lib/registration/service";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = String(issue.path[0] ?? "_");
      if (!fields[k]) fields[k] = issue.message;
    }
    return NextResponse.json({ error: "Datos incompletos", fields }, { status: 422 });
  }

  try {
    const result = await createRegistration(getDb(), parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof RegError) {
      return NextResponse.json({ error: e.message, fields: e.fields }, { status: e.status });
    }
    console.error("[inscripciones]", e);
    return NextResponse.json({ error: "Error interno al procesar la inscripcion" }, { status: 500 });
  }
}
