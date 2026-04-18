import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_KEY,
  },
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 10000,
});

type OrderEmailItem = {
  productName: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
};

type OrderConfirmationEmailInput = {
  orderId: string;
  customerName?: string | null;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  creatorCode?: string | null;
  invoiceAttachment?: {
    filename?: string;
    content: Uint8Array;
  } | null;
  shippingAddress?: {
    label?: string | null;
    fullName: string;
    line1: string;
    line2?: string | null;
    postalCode: string;
    city: string;
    country: string;
    phone?: string | null;
  } | null;
  items: OrderEmailItem[];
};

function formatPrice(cents: number) {
  return new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendVerificationEmail(email: string, code: string) {
  const info = await transporter.sendMail({
    from: `"${process.env.BREVO_FROM_NAME}" <${process.env.BREVO_FROM_EMAIL}>`,
    to: email,
    subject: "Potrdite vaš email — Leso",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="font-weight: 300; letter-spacing: 4px; text-transform: uppercase;">LESO</h2>
        <p style="color: #555;">Hvala za registracijo. Za potrditev emaila vnesite spodnjo kodo:</p>
        <div style="text-align: center; margin: 32px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #1c1c1c;">
            ${code}
          </span>
        </div>
        <p style="color: #999; font-size: 13px;">Koda velja 15 minut. Če niste vi zahtevali registracije, ignorirajte ta email.</p>
      </div>
    `,
  });
  console.log("✉️ Verification email sent:", info.messageId, "response:", info.response);
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password/${token}`;

  await transporter.sendMail({
    from: `"${process.env.BREVO_FROM_NAME}" <${process.env.BREVO_FROM_EMAIL}>`,
    to: email,
    subject: "Ponastavitev gesla — Leso",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="font-weight: 300; letter-spacing: 4px; text-transform: uppercase;">LESO</h2>
        <p style="color: #555;">Prejeli smo zahtevo za ponastavitev gesla za vaš račun.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}"
             style="background: #1c1c1c; color: white; padding: 14px 32px; text-decoration: none;
                    font-size: 13px; letter-spacing: 2px; text-transform: uppercase;">
            Ponastavi geslo
          </a>
        </div>
        <p style="color: #999; font-size: 13px;">Povezava velja 1 uro. Če niste vi zahtevali ponastavitve, ignorirajte ta email.</p>
      </div>
    `,
  });
}

export async function sendOrderConfirmationEmail(
  email: string,
  data: OrderConfirmationEmailInput
) {
  const ordersUrl = `${process.env.NEXTAUTH_URL}/orders`;
  const customerLabel = data.customerName?.trim() || "Kupec";
  const rowsHtml = data.items
    .map(
      (item) => `
        <tr>
          <td style="padding: 10px 8px; border-bottom: 1px solid #eee;">${escapeHtml(item.productName)}</td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #eee; text-align: right;">${item.quantity}</td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(item.unitPriceCents)}</td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(item.lineTotalCents)}</td>
        </tr>
      `
    )
    .join("");
  const shippingAddressHtml = data.shippingAddress
    ? `
      <div style="margin: 0 0 18px; padding: 14px 16px; border: 1px solid #e5e7eb;">
        <p style="margin: 0 0 8px;"><strong>Naslov dostave</strong></p>
        ${
          data.shippingAddress.label
            ? `<p style="margin: 0; color: #6b7280;">${escapeHtml(data.shippingAddress.label)}</p>`
            : ""
        }
        <p style="margin: 0;">${escapeHtml(data.shippingAddress.fullName)}</p>
        <p style="margin: 0;">${escapeHtml(data.shippingAddress.line1)}</p>
        ${
          data.shippingAddress.line2
            ? `<p style="margin: 0;">${escapeHtml(data.shippingAddress.line2)}</p>`
            : ""
        }
        <p style="margin: 0;">
          ${escapeHtml(data.shippingAddress.postalCode)} ${escapeHtml(data.shippingAddress.city)}
        </p>
        <p style="margin: 0;">${escapeHtml(data.shippingAddress.country)}</p>
        ${
          data.shippingAddress.phone
            ? `<p style="margin: 6px 0 0; color: #6b7280;">Tel: ${escapeHtml(data.shippingAddress.phone)}</p>`
            : ""
        }
      </div>
    `
    : "";

  const attachments = data.invoiceAttachment
    ? [
        {
          filename: data.invoiceAttachment.filename ?? `racun-${data.orderId.slice(0, 8)}.pdf`,
          content: Buffer.from(data.invoiceAttachment.content),
          contentType: "application/pdf",
        },
      ]
    : undefined;

  await transporter.sendMail({
    from: `"${process.env.BREVO_FROM_NAME}" <${process.env.BREVO_FROM_EMAIL}>`,
    to: email,
    subject: `Potrdilo narocila - Leso (#${data.orderId.slice(0, 8)})`,
    attachments,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 720px; margin: 0 auto; color: #1f2937;">
        <h2 style="font-weight: 300; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 6px;">LESO</h2>
        <p style="margin: 0 0 20px; color: #6b7280;">Hvala za nakup, ${escapeHtml(customerLabel)}.</p>

        <div style="padding: 14px 16px; background: #f9fafb; border: 1px solid #e5e7eb; margin-bottom: 18px;">
          <p style="margin: 0 0 6px;"><strong>ID narocila:</strong> ${escapeHtml(data.orderId)}</p>
          <p style="margin: 0 0 6px;"><strong>Vmesni znesek:</strong> ${formatPrice(data.subtotalCents)}</p>
          <p style="margin: 0 0 6px;"><strong>Popust:</strong> -${formatPrice(data.discountCents)}</p>
          <p style="margin: 0 0 6px;"><strong>Dostava:</strong> ${data.shippingCents === 0 ? "Brezplacno" : formatPrice(data.shippingCents)}</p>
          <p style="margin: 0; font-size: 18px;"><strong>Skupaj:</strong> ${formatPrice(data.totalCents)}</p>
          ${
            data.creatorCode
              ? `<p style="margin: 8px 0 0; color: #6b7280;"><strong>Koda:</strong> ${escapeHtml(data.creatorCode)}</p>`
              : ""
          }
        </div>
        ${shippingAddressHtml}

        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb;">
          <thead>
            <tr style="background: #f3f4f6; text-align: left;">
              <th style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb;">Izdelek</th>
              <th style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">Kolicina</th>
              <th style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">Cena/kos</th>
              <th style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">Skupaj</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>

        <p style="margin-top: 18px; color: #6b7280;">
          Naročilo lahko kadarkoli preverite v svojem racunu:
          <a href="${ordersUrl}" style="color: #111827;"> ${ordersUrl}</a>
        </p>
      </div>
    `,
  });
}
