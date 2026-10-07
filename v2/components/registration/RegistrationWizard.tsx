"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  registrationSchema,
  isPanamaMobile,
  SHIRT_SIZES,
} from "@/lib/registration/schema";
import { formatCedula, phoneDigits } from "@/lib/cedula";

// formateo en vivo: muestra guiones solo cuando la cedula ya es valida
function cedulaInput(v: string): string {
  const f = formatCedula(v);
  if (f) return f;
  return v.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 11);
}

type Distance = { id: string; title: string; kilometers: number; price: number | null; description: string | null };
type Category = { id: string; title: string; minAge: number; maxAge: number; gender: string; description: string | null };

export type WizardRace = {
  slug: string;
  title: string;
  dateLabel: string | null;
  price: number;
  platformFee: number;
  showShirtSize: boolean;
  maxParticipants: number | null;
  distances: Distance[];
  categories: Category[];
  termsUrl: string;
};

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cedula: string;
  birthDate: string;
  gender: "masculino" | "femenino" | "otro";
  distanceId: string;
  teamName: string;
  shirtSize: "" | (typeof SHIRT_SIZES)[number];
  code: string;
};

type Result = {
  registrationId: string;
  confirmationCode: string;
  status: string;
  paymentStatus: string;
  amount: number;
  category: string | null;
  pay?: { transactionId: string; token: string; documentName: string };
};

const YAPPY_SCRIPT = "https://bt-cdn.yappy.cloud/v1/cdn/web-component-btn-yappy.js";
const PENDING_KEY = "stryd_v2_pending_yappy";

const fieldCls =
  "h-13 w-full rounded-xl border border-hairline bg-carbon px-4 text-[16px] text-snow placeholder:text-mist/60 outline-none transition focus:border-stryd/70 focus:ring-2 focus:ring-stryd/25";
const labelCls = "mb-2 block font-mono text-[11px] uppercase tracking-[0.25em] text-mist";

function ageFrom(birthDate: string): number | null {
  const b = new Date(birthDate + "T12:00:00");
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
  return age >= 3 && age <= 100 ? age : null;
}

function matchCategory(categories: Category[], age: number | null, gender: string): Category | null {
  if (age == null) return null;
  return (
    categories.find(
      (c) => (c.gender === "ambos" || c.gender === gender) && age >= c.minAge && (c.maxAge > 90 || age <= c.maxAge),
    ) ?? null
  );
}

const STEP_FIELDS: Record<number, (keyof FormData)[]> = {
  1: ["firstName", "lastName", "email", "phone", "cedula", "birthDate", "gender"],
  2: ["distanceId"],
  3: ["teamName"],
};

function validateStep(step: number, race: WizardRace, data: FormData): Record<string, string> {
  const fields = step === 3 ? [...STEP_FIELDS[3]!, ...(race.showShirtSize && !data.shirtSize ? ["shirtSize"] : [])] : STEP_FIELDS[step] ?? [];
  const slice = registrationSchema.pick(
    Object.fromEntries(fields.map((f) => [f, true])) as any,
  );
  const parsed = slice.safeParse({ ...data, shirtSize: data.shirtSize || undefined });
  if (parsed.success) return {};
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const k = String(issue.path[0] ?? "_");
    if (!errors[k]) errors[k] = issue.message;
  }
  return errors;
}

export function RegistrationWizard({ race }: { race: WizardRace }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    cedula: "",
    birthDate: "",
    gender: "masculino",
    distanceId: race.distances[0]?.id ?? "",
    teamName: "",
    shirtSize: "",
    code: "",
  });
  const [method, setMethod] = useState<"yappy" | "transferencia" | "efectivo" | "code">(
    race.distances[0] ? "yappy" : "transferencia",
  );
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [confirmed, setConfirmed] = useState<{ bib: number | null } | null>(null);
  const [copyOk, setCopyOk] = useState(false);

  const yappyRef = useRef<any>(null);
  const yappySlotRef = useRef<HTMLSpanElement | null>(null);
  const yappyEvents = useRef({ attached: false });

  const age = ageFrom(data.birthDate);
  const category = useMemo(() => matchCategory(race.categories, age, data.gender), [race.categories, age, data.gender]);
  const basePrice = useMemo(() => {
    const d = race.distances.find((x) => x.id === data.distanceId);
    return d?.price ?? race.price;
  }, [race, data.distanceId]);
  const total = method === "yappy" ? Math.round((basePrice + race.platformFee) * 100) / 100 : basePrice;

  // Cargar el web component de Yappy y montarlo en el slot oculto
  useEffect(() => {
    if (!document.querySelector("script[data-yappy]")) {
      const s = document.createElement("script");
      s.src = YAPPY_SCRIPT;
      s.type = "module";
      s.dataset.yappy = "1";
      document.head.appendChild(s);
    }
    const slot = yappySlotRef.current;
    if (!slot || slot.childElementCount > 0) return;
    const t = setTimeout(() => {
      if (!customElements.get("btn-yappy") || !slot.isConnected || slot.childElementCount > 0) return;
      const el = document.createElement("btn-yappy");
      slot.appendChild(el);
      yappyRef.current = el;
      if (!yappyEvents.current.attached) {
        yappyEvents.current.attached = true;
        attachYappyEvents();
      }
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reanudar pago Yappy interrumpido (el browser del celular mata la pestaña)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PENDING_KEY);
      if (!raw) return;
      const { registrationId, orderId, at } = JSON.parse(raw) as { registrationId: string; orderId: string; at: number };
      if (Date.now() - at > 1000 * 60 * 30) {
        localStorage.removeItem(PENDING_KEY);
        return;
      }
      void pollStatus(registrationId, true);
    } catch {
      localStorage.removeItem(PENDING_KEY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pollStatus(id: string, autoAdvance: boolean) {
    try {
      const res = await fetch(`/api/inscripciones/${id}`);
      if (!res.ok) return null;
      const j = (await res.json()) as any;
      setResult({
        registrationId: id,
        confirmationCode: j.confirmationCode,
        status: j.status,
        paymentStatus: j.paymentStatus,
        amount: j.amountPaid,
        category: null,
      });
      if (j.status === "inscrito") {
        setConfirmed({ bib: j.bibNumber ?? null });
        localStorage.removeItem(PENDING_KEY);
        if (autoAdvance) setStep(5);
      } else {
        setStep(4);
      }
      return j;
    } catch {
      return null;
    }
  }

  function go(n: number) {
    setErrors({});
    setFatal(null);
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function next() {
    const errs = validateStep(step, race, data);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    go(step + 1);
  }

  async function createRegistration(): Promise<Result | null> {
    setSubmitting(true);
    setFatal(null);
    try {
      const payload = {
        slug: race.slug,
        ...data,
        shirtSize: data.shirtSize || undefined,
        teamName: data.teamName || undefined,
        code: data.code || undefined,
        termsAccepted: terms,
        method: method === "code" ? "code" : data.code ? method : method,
      };
      const res = await fetch("/api/inscripciones", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = (await res.json()) as any;
      if (!res.ok) {
        const mapped: Record<string, string> = { ...j.fields };
        if (j.error) mapped._ = j.error;
        setErrors(mapped);
        if (method === "yappy" && res.status === 502) {
          setFatal("Yappy no está disponible ahora mismo. Puedes pagar por transferencia o efectivo.");
        }
        return null;
      }
      const r: Result = {
        registrationId: j.registrationId,
        confirmationCode: j.confirmationCode,
        status: j.status,
        paymentStatus: j.paymentStatus,
        amount: j.amount,
        category: j.category,
        pay: j.pay,
      };
      setResult(r);
      return r;
    } catch {
      setFatal("Sin conexión. Revisa tu internet e inténtalo de nuevo.");
      return null;
    } finally {
      setSubmitting(false);
    }
  }

  async function submitManual() {
    const r = await createRegistration();
    if (r) go(4);
  }

  // Yappy: crea la inscripcion+orden y luego dispara el overlay oficial
  async function payWithYappy() {
    const r = await createRegistration();
    if (!r) return;
    const bp = yappyRef.current;
    if (!r.pay || !bp || typeof bp.eventPayment !== "function") {
      setFatal("No se pudo abrir Yappy. Tu preinscripción quedó guardada — puedes pagar por transferencia o efectivo.");
      go(4);
      return;
    }
    localStorage.setItem(PENDING_KEY, JSON.stringify({ registrationId: r.registrationId, orderId: r.confirmationCode, at: Date.now() }));
    try {
      bp.eventPayment(r.pay);
    } catch {
      setFatal("No se pudo abrir Yappy. Tu preinscripción quedó guardada — puedes pagar por transferencia o efectivo.");
      go(4);
    }
  }

  function attachYappyEvents() {
    const el = yappyRef.current;
    if (!el) return;
    el.addEventListener("eventSuccess", async () => {
      if (!result) return;
      setSubmitting(true);
      try {
        const res = await fetch("/api/inscripciones/confirm", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ orderId: result.confirmationCode }),
        });
        const j = (await res.json()) as any;
        setConfirmed({ bib: j.bibNumber ?? null });
      } finally {
        setSubmitting(false);
        localStorage.removeItem(PENDING_KEY);
        go(5);
      }
    });
    el.addEventListener("eventCancel", () => {
      setFatal("Pago interrumpido. Tu cupo está reservado como preinscripción.");
      go(4);
    });
  }

  function copyCode() {
    if (!result) return;
    void navigator.clipboard.writeText(result.confirmationCode);
    setCopyOk(true);
    setTimeout(() => setCopyOk(false), 1800);
  }

  // ============ RENDER ============

  if (step === 5 && result) {
    return <DoneScreen race={race} result={result} confirmed={confirmed} />;
  }

  const stepTitle = ["Tus datos", "Modalidad", "Detalles", "Pago"][step];
  const isLast = step === 3;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pb-32 pt-4 sm:pt-10">
      {/* header */}
      <div className="flex items-center justify-between gap-3">
        <Link href={`/carrera/${race.slug}`} className="font-mono text-xs uppercase tracking-widest text-mist hover:text-stryd">
          ← {race.title}
        </Link>
        <span className="font-mono text-[11px] text-mist">Paso {step + 1} de 4</span>
      </div>
      <div className="mt-3 flex gap-1.5" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-stryd" : "bg-white/10"}`} />
        ))}
      </div>
      <h1 className="font-display mt-6 text-3xl font-bold text-snow">{stepTitle}</h1>
      <p className="mt-1 text-sm text-mist">{race.dateLabel ? `${race.dateLabel} · ` : ""}Inscripción rápida, toma menos de 2 minutos.</p>

      {/* STEP 1 — datos */}
      {step === 0 && (
        <div className="mt-6 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre(s)" error={errors.firstName}>
              <input className={fieldCls} value={data.firstName} onChange={(e) => setData({ ...data, firstName: e.target.value })} autoComplete="given-name" placeholder="Maria" />
            </Field>
            <Field label="Apellidos" error={errors.lastName}>
              <input className={fieldCls} value={data.lastName} onChange={(e) => setData({ ...data, lastName: e.target.value })} autoComplete="family-name" placeholder="González" />
            </Field>
          </div>
          <Field label="Cédula" error={errors.cedula}>
            <input className={fieldCls} inputMode="text" value={data.cedula} onChange={(e) => setData({ ...data, cedula: cedulaInput(e.target.value) })} placeholder="8-1234-567" autoCapitalize="characters" autoComplete="off" />
          </Field>
          <Field label="Fecha de nacimiento" error={errors.birthDate}>
            <input className={fieldCls} type="date" value={data.birthDate} onChange={(e) => setData({ ...data, birthDate: e.target.value })} />
            {age != null && <p className="mt-1.5 text-xs text-mist">{age} años {category ? `· categoría ${category.title}` : "· sin categoría asignada"}</p>}
          </Field>
          <Field label="Género" error={errors.gender}>
            <div className="grid grid-cols-3 gap-2">
              {(["masculino", "femenino", "otro"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setData({ ...data, gender: g })}
                  className={`h-12 rounded-xl border text-sm capitalize transition ${
                    data.gender === g ? "border-stryd bg-stryd/10 font-semibold text-stryd" : "border-hairline bg-carbon text-mist hover:text-snow"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Correo" error={errors.email}>
            <input className={fieldCls} type="email" inputMode="email" value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} placeholder="tu@correo.com" autoComplete="email" />
          </Field>
          <Field label="Teléfono" error={errors.phone} hint="Celular panameño, 8 dígitos. Empieza con 6 para pagar con Yappy.">
            <input className={fieldCls} type="tel" inputMode="tel" value={data.phone} onChange={(e) => setData({ ...data, phone: phoneDigits(e.target.value).slice(0, 10) })} placeholder="6123-4567" autoComplete="tel" />
          </Field>
        </div>
      )}

      {/* STEP 2 — modalidad */}
      {step === 1 && (
        <div className="mt-6 flex flex-col gap-3">
          {race.distances.map((d) => {
            const active = data.distanceId === d.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setData({ ...data, distanceId: d.id })}
                className={`flex items-center justify-between rounded-card border p-5 text-left transition ${
                  active ? "border-stryd bg-stryd/5 shadow-card" : "border-hairline bg-abyss hover:border-white/20"
                }`}
              >
                <div>
                  <p className="font-display text-lg font-semibold text-snow">{d.title}</p>
                  <p className="mt-0.5 font-mono text-xs text-mist">{d.kilometers} km{d.description ? ` · ${d.description}` : ""}</p>
                </div>
                <div className="text-right">
                  <p className={`font-mono text-sm font-semibold ${active ? "text-stryd" : "text-fog"}`}>
                    {d.price ?? race.price > 0 ? `B/. ${(d.price ?? race.price).toFixed(2)}` : "Gratis"}
                  </p>
                  {active && <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-stryd">Seleccionada</p>}
                </div>
              </button>
            );
          })}
          {errors.distanceId && <p className="text-sm text-red-400">{errors.distanceId}</p>}
        </div>
      )}

      {/* STEP 3 — detalles */}
      {step === 2 && (
        <div className="mt-6 flex flex-col gap-5">
          {race.showShirtSize && (
            <Field label="Talla de camiseta" error={errors.shirtSize}>
              <div className="flex flex-wrap gap-2">
                {SHIRT_SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setData({ ...data, shirtSize: s })}
                    className={`h-11 min-w-12 rounded-xl border px-4 font-mono text-sm transition ${
                      data.shirtSize === s ? "border-stryd bg-stryd/10 font-bold text-stryd" : "border-hairline bg-carbon text-mist hover:text-snow"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Field>
          )}
          <Field label="Equipo de running (opcional)">
            <input className={fieldCls} value={data.teamName} onChange={(e) => setData({ ...data, teamName: e.target.value })} placeholder="Ej. Track Club Panamá" />
          </Field>
          <Field label="Código de invitación (opcional)" error={errors.code} hint="Si tienes código de vendor o exento, se lo pedimos al final.">
            <input className={fieldCls} value={data.code} onChange={(e) => setData({ ...data, code: e.target.value.toUpperCase() })} placeholder="ABC123" autoCapitalize="characters" />
          </Field>
          <Card className="p-4">
            <p className="font-mono text-[11px] uppercase tracking-widest text-mist">Resumen</p>
            <p className="mt-2 text-sm text-fog">
              {data.firstName} {data.lastName} · {race.distances.find((d) => d.id === data.distanceId)?.title}
              {category ? ` · ${category.title}` : ""}
              {data.shirtSize ? ` · Talla ${data.shirtSize}` : ""}
            </p>
          </Card>
        </div>
      )}

      {/* STEP 4 — pago */}
      {step === 3 && (
        <div className="mt-6 flex flex-col gap-3">
          <MethodCard
            id="yappy"
            title="Yappy"
            subtitle="Paga al instante desde tu app. Requiere celular panameño que empiece con 6."
            badge="Recomendado"
            disabled={!isPanamaMobile(data.phone)}
            active={method === "yappy"}
            onSelect={() => setMethod("yappy")}
          />
          <MethodCard id="transferencia" title="Transferencia" subtitle="OXXO pay, SINPE móvil o transferencia bancaria. Quedas preinscrito hasta verificar." active={method === "transferencia"} onSelect={() => setMethod("transferencia")} />
          <MethodCard id="efectivo" title="Efectivo" subtitle="Pago en efectivo el día de la expo. Quedas preinscrito hasta verificar." active={method === "efectivo"} onSelect={() => setMethod("efectivo")} />
          {data.code && (
            <MethodCard id="code" title={`Usar código ${data.code}`} subtitle="Inscripción exenta: quedas confirmado al instante." active={method === "code"} onSelect={() => setMethod("code")} />
          )}

          {/* resumen */}
          <Card className="mt-2 p-4">
            <div className="flex justify-between text-sm text-mist">
              <span>Inscripción</span>
              <span className="font-mono text-fog">B/. {basePrice.toFixed(2)}</span>
            </div>
            {method === "yappy" && race.platformFee > 0 && (
              <div className="mt-1.5 flex justify-between text-sm text-mist">
                <span>Comisión de plataforma</span>
                <span className="font-mono text-fog">B/. {race.platformFee.toFixed(2)}</span>
              </div>
            )}
            {method === "code" && <p className="mt-1.5 text-sm text-stryd">Código aplicado — B/. 0.00</p>}
            <div className="mt-3 flex justify-between border-t border-hairline pt-3">
              <span className="font-display font-semibold text-snow">Total</span>
              <span className="font-mono text-lg font-bold text-stryd">{method === "code" ? "Gratis" : `B/. ${total.toFixed(2)}`}</span>
            </div>
          </Card>

          <label className="mt-2 flex items-start gap-3 text-sm text-mist">
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1 h-5 w-5 accent-[#FF6B00]" />
            <span>
              Acepto los{" "}
              <Link href={race.termsUrl} target="_blank" className="text-stryd underline underline-offset-2">
                términos y condiciones
              </Link>{" "}
              de {race.title}.
            </span>
          </label>

          {fatal && <p className="rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-sm text-red-300">{fatal}</p>}
          {errors._ && !fatal && <p className="text-sm text-red-400">{errors._}</p>}
          {errors.phone && method === "yappy" && <p className="text-sm text-red-400">{errors.phone}</p>}
        </div>
      )}

      {/* preinscrito (despues de manual/code) */}
      {step === 4 && result && (
        <Card className="mt-6 p-6">
          <p className="font-mono text-[11px] uppercase tracking-widest text-stryd">{result.paymentStatus === "exento" ? "¡Inscrito!" : "Preinscripción registrada"}</p>
          <p className="font-display mt-2 text-2xl font-bold text-snow">
            {result.paymentStatus === "exento" ? "Tu cupo está confirmado" : "Guarda tu código de confirmación"}
          </p>
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-hairline bg-void p-4">
            <span className="font-mono text-xl font-bold tracking-[0.2em] text-stryd">{result.confirmationCode}</span>
            <Button variant="outline" size="sm" onClick={copyCode}>
              {copyOk ? "Copiado ✓" : "Copiar"}
            </Button>
          </div>
          {result.paymentStatus === "exento" ? (
            <p className="mt-4 text-sm text-mist">
              Tu dorsal es <b className="text-snow">#{confirmed?.bib ?? "asignado"}</b>. Preséntalo con este código en la expo de entrega de kits.
            </p>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-mist">
              Paga <b className="text-snow">B/. {result.amount.toFixed(2)}</b> por {method === "efectivo" ? "efectivo" : "transferencia"} y comparte tu código con un coordinador.
              Cuando el pago sea verificado pasarás a <b className="text-snow">Inscrito</b> con dorsal asignado.
            </p>
          )}
          <Button variant="secondary" size="md" className="mt-5 w-full" onClick={() => void pollStatus(result.registrationId, true)}>
            ¿Ya pagaste? Verificar estado
          </Button>
          <p className="mt-2 text-center text-xs text-mist">Se actualiza solo en cuanto verifiquemos tu pago.</p>
        </Card>
      )}

      {/* CTA fijo abajo */}
      {step < 4 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-hairline bg-abyss/95 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 backdrop-blur">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            {step > 0 && (
              <Button variant="ghost" size="lg" onClick={() => go(step - 1)} aria-label="Atrás">
                ←
              </Button>
            )}
            {step < 3 && <Button size="lg" className="flex-1" onClick={next}>Continuar</Button>}
            {step === 3 && method !== "yappy" && (
              <Button size="lg" className="flex-1" disabled={!terms || submitting} onClick={() => void submitManual()}>
                {submitting ? "Enviando…" : method === "code" ? "Confirmar inscripción" : "Finalizar preinscripción"}
              </Button>
            )}
            {step === 3 && method === "yappy" && (
              <>
                <Button size="lg" className="flex-1" disabled={!terms || submitting || !isLast} onClick={() => void payWithYappy()}>
                  {submitting ? "Conectando Yappy…" : `Pagar B/. ${total.toFixed(2)} con Yappy`}
                </Button>
              </>
            )}
          </div>
          {step === 3 && !terms && <p className="mx-auto mt-2 max-w-lg text-center text-[11px] text-mist">Acepta los términos para continuar</p>}
        </div>
      )}

      {/* web component oculto de Yappy */}
      <div className="pointer-events-none fixed -bottom-[500px] left-[-500px]">
        <span ref={yappySlotRef as any} />
      </div>
    </div>
  );
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
      {error ? <p className="mt-1.5 text-sm text-red-400">{error}</p> : hint ? <p className="mt-1.5 text-xs text-mist/80">{hint}</p> : null}
    </div>
  );
}

function MethodCard({
  id,
  title,
  subtitle,
  badge,
  active,
  disabled,
  onSelect,
}: {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  active: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`flex items-start gap-4 rounded-card border p-5 text-left transition disabled:opacity-45 ${
        active ? "border-stryd bg-stryd/5 shadow-card" : "border-hairline bg-abyss hover:border-white/20"
      }`}
      data-method={id}
    >
      <span className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 ${active ? "border-stryd bg-stryd" : "border-mist/40"}`} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="font-display text-base font-semibold text-snow">{title}</span>
          {badge && <span className="rounded-full bg-stryd/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-stryd">{badge}</span>}
        </span>
        <span className="mt-1 block text-sm leading-snug text-mist">{subtitle}</span>
      </span>
    </button>
  );
}

function DoneScreen({ race, result, confirmed }: { race: WizardRace; result: Result; confirmed: { bib: number | null } | null }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-stryd/15 ring-1 ring-stryd/40">
        <span className="text-4xl" aria-hidden>✓</span>
      </div>
      <h1 className="font-display mt-6 text-3xl font-bold text-snow">¡Estás inscrito!</h1>
      <p className="mt-2 text-mist">
        {result.status === "inscrito" ? "Tu pago quedó confirmado." : "Te avisaremos cuando verifiquemos tu pago."}{" "}
        <b className="text-snow">{race.title}</b>
      </p>
      {confirmed?.bib != null && (
        <Card className="mt-8 w-full p-6">
          <p className="font-mono text-[11px] uppercase tracking-widest text-mist">Tu dorsal</p>
          <p className="font-display mt-1 text-6xl font-black text-stryd">#{confirmed.bib}</p>
        </Card>
      )}
      <Card className="mt-4 w-full p-6">
        <p className="font-mono text-[11px] uppercase tracking-widest text-mist">Código de confirmación</p>
        <p className="font-mono mt-1 text-xl font-bold tracking-[0.2em] text-snow">{result.confirmationCode}</p>
        <p className="mt-3 text-sm text-mist">Guárdalo: lo necesitarás para recoger tu kit.</p>
      </Card>
      <div className="mt-8 flex w-full gap-3">
        <Button asChild variant="outline" size="lg" className="flex-1">
          <Link href={`/carrera/${race.slug}`}>Volver a la carrera</Link>
        </Button>
        <Button asChild size="lg" className="flex-1">
          <Link href="/">Inicio</Link>
        </Button>
      </div>
    </div>
  );
}
