import { env } from "cloudflare:workers";

export interface RegistrationEmailData {
  email: string;
  firstName: string;
  lastName: string;
  raceTitle: string;
  raceSlug: string;
  distanceTitle: string | null;
  categoryTitle: string | null;
  confirmationCode: string;
  method: "yappy" | "transferencia" | "efectivo" | "code";
  amount: number;
  bibNumber?: number | null;
  confirmed?: boolean;
}

const SITE = "https://carreras.strydpanama.com";

function shell(body: string, preheader: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#0A0A0B;font-family:Arial,Helvetica,sans-serif;">
<span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#141416;border:1px solid #2d2d2d;border-radius:14px;overflow:hidden;">
<tr><td style="background:#000;padding:28px 30px;text-align:center;">
  <div style="color:#FF6B00;font-size:22px;font-weight:800;letter-spacing:2px;">STRYD PANAMA</div>
  <div style="color:#ffffff;font-size:13px;margin-top:6px;text-transform:uppercase;letter-spacing:3px;">Carreras pedestres</div>
</td></tr>
<tr><td style="padding:30px;color:#c9c9cd;font-size:15px;line-height:1.65;">${body}</td></tr>
<tr><td style="padding:18px 30px;border-top:1px solid #2d2d2d;color:#8A8A8E;font-size:12px;text-align:center;">
  Dudas: <a href="mailto:carreras@strydpanama.com" style="color:#FF6B00;text-decoration:none;">carreras@strydpanama.com</a>
</td></tr></table></td></tr></table></body></html>`;
}

function codeBox(code: string): string {
  return `<div style="background:#0A0A0B;border:1px solid #FF6B00;border-radius:10px;padding:16px;text-align:center;margin:20px 0;">
  <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#8A8A8E;">Código de confirmación</div>
  <div style="font-size:24px;font-weight:800;color:#FF6B00;letter-spacing:4px;margin-top:6px;font-family:'Courier New',monospace;">${code}</div>
</div>`;
}

export function buildRegistrationEmail(d: RegistrationEmailData): { subject: string; html: string } {
  if (d.confirmed) {
    const bib = d.bibNumber != null
      ? `<div style="text-align:center;margin:18px 0 6px;"><div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#8A8A8E;">Tu dorsal</div>
         <div style="font-size:52px;font-weight:900;color:#ffffff;margin-top:4px;">#${d.bibNumber}</div></div>`
      : "";
    return {
      subject: `Confirmación de inscripción: ${d.raceTitle}`,
      html: shell(
        `<h2 style="color:#ffffff;margin:0 0 14px;">¡Estás inscrito, ${d.firstName}! 🎉</h2>
         <p>Tu pago quedó confirmado para <strong style="color:#ffffff;">${d.raceTitle}</strong>.</p>
         ${bib}
         ${codeBox(d.confirmationCode)}
         <p style="margin:0;">Modalidad: <strong style="color:#ffffff;">${d.distanceTitle ?? "—"}</strong>${d.categoryTitle ? ` · Categoría: <strong style="color:#ffffff;">${d.categoryTitle}</strong>` : ""}</p>
         <p style="margin-top:14px;">Preséntate a la expo de entrega de kits con tu <strong style="color:#ffffff;">código de confirmación</strong> y tu documento de identidad. Tu chip/camiseta se entrega solo con ambos.</p>
         <p style="margin-top:14px;">Más detalles en tu carrera: <a href="${SITE}/carrera/${d.raceSlug}" style="color:#FF6B00;">ver información de la carrera</a></p>`,
        `Pago confirmado — dorsal ${d.bibNumber ?? "por asignar"} en ${d.raceTitle}`,
      ),
    };
  }

  if (d.method === "code") {
    return {
      subject: `Inscripción confirmada: ${d.raceTitle}`,
      html: shell(
        `<h2 style="color:#ffffff;margin:0 0 14px;">¡Cupo confirmado, ${d.firstName}!</h2>
         <p>Tu inscripción con código quedó confirmada para <strong style="color:#ffffff;">${d.raceTitle}</strong>.</p>
         ${codeBox(d.confirmationCode)}
         <p style="margin:0;">Modalidad: <strong style="color:#ffffff;">${d.distanceTitle ?? "—"}</strong>${d.categoryTitle ? ` · Categoría: <strong style="color:#ffffff;">${d.categoryTitle}</strong>` : ""}</p>
         <p style="margin-top:14px;">Guarda tu código: lo necesitarás en la expo de entrega de kits junto con tu documento de identidad.</p>`,
        `Inscripción confirmada en ${d.raceTitle}`,
      ),
    };
  }

  const payLine =
    d.method === "efectivo"
      ? "Paga en <strong style=\"color:#ffffff;\">efectivo</strong> en la expo de la carrera."
      : d.method === "transferencia"
        ? "Realiza tu <strong style=\"color:#ffffff;\">transferencia o pago</strong> y comparte tu comprobante con un coordinador."
        : "Completa tu pago con <strong style=\"color:#ffffff;\">Yappy</strong> para confirmar tu cupo.";
  return {
    subject: `Preinscripción: ${d.raceTitle}`,
    html: shell(
      `<h2 style="color:#ffffff;margin:0 0 14px;">Hola ${d.firstName}, tu cupo está reservado</h2>
       <p>Quedaste <strong style="color:#ffffff;">preinscrito(a)</strong> en <strong style="color:#ffffff;">${d.raceTitle}</strong>. Aún no tienes dorsal: se asigna al confirmarse el pago.</p>
       ${codeBox(d.confirmationCode)}
       <p style="margin:0;">Modalidad: <strong style="color:#ffffff;">${d.distanceTitle ?? "—"}</strong>${d.categoryTitle ? ` · Categoría: <strong style="color:#ffffff;">${d.categoryTitle}</strong>` : ""} · Monto: <strong style="color:#ffffff;">B/. ${d.amount.toFixed(2)}</strong></p>
       <p style="margin-top:14px;">${payLine} En cuanto lo verifiquemos recibirás tu <strong style="color:#ffffff;">confirmación oficial con tu dorsal</strong>.</p>`,
      `Preinscripción registrada en ${d.raceTitle}`,
    ),
  };
}

export async function sendRegistrationEmail(d: RegistrationEmailData): Promise<boolean> {
  const key = env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY ausente — no se envió correo a", d.email);
    return false;
  }
  const { subject, html } = buildRegistrationEmail(d);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: "Carreras Stryd Panama <carreras@strydpanama.com>",
        to: [d.email],
        bcc: ["carreras@strydpanama.com"],
        subject,
        html,
      }),
    });
    if (!res.ok) console.error("[email] resend error", res.status, (await res.text()).slice(0, 200));
    return res.ok;
  } catch (e) {
    console.error("[email] fallo enviando:", String(e).slice(0, 160));
    return false;
  }
}
