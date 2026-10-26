import "server-only";
import nodemailer from "nodemailer";

/**
 * Notificaciones por email vía SMTP (por ejemplo, Gmail con contraseña de aplicación: sin costo).
 * Si no está configurado, se informa "not_configured" y NUNCA se dice que se envió.
 */
export function emailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendEmail(to: string, subject: string, text: string): Promise<{ status: "sent" | "not_configured" | "failed"; error?: string }> {
  if (!emailConfigured()) return { status: "not_configured" };
  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 465),
      secure: Number(process.env.SMTP_PORT ?? 465) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transport.sendMail({ from: process.env.SMTP_FROM ?? process.env.SMTP_USER, to, subject, text });
    return { status: "sent" };
  } catch (e) {
    return { status: "failed", error: (e as Error).message.slice(0, 300) };
  }
}

export function whatsappLink(phoneIntl: string, text: string): string {
  return `https://wa.me/${phoneIntl.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}
