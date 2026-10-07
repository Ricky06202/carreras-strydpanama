import { NextResponse } from "next/server";
import { isAdmin } from "./session";

/** Para route handlers: devuelve NextResponse 401 si no hay sesión admin. */
export async function guardAdmin(): Promise<NextResponse | null> {
  if (await isAdmin()) return null;
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}
