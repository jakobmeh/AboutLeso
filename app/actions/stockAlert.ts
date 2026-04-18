"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import nodemailer from "nodemailer";
import { getAppBaseUrl } from "@/lib/app-url";

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: { user: process.env.BREVO_SMTP_USER, pass: process.env.BREVO_SMTP_KEY },
});

export async function subscribeStockAlert(formData: FormData) {
  const variantId = formData.get("variantId") as string;
  let email = (formData.get("email") as string)?.trim().toLowerCase();

  if (!email) {
    const session = await auth();
    email = session?.user?.email ?? "";
  }

  if (!email || !variantId) return { error: "Manjka email ali varianta." };

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { stock: true },
  });
  if (!variant) return { error: "Varianta ne obstaja." };
  if (variant.stock > 0) return { error: "Izdelek je že na zalogi." };

  await prisma.stockAlert.upsert({
    where: { email_productVariantId: { email, productVariantId: variantId } },
    update: {},
    create: { email, productVariantId: variantId },
  });

  return { success: true };
}

export async function sendStockAlerts(variantId: string) {
  const alerts = await prisma.stockAlert.findMany({
    where: { productVariantId: variantId },
    include: { variant: { include: { product: { select: { name: true, slug: true } } } } },
  });

  if (alerts.length === 0) return;

  const { variant } = alerts[0];
  const productName = variant.product.name;
  const size = variant.size;
  const productUrl = `${getAppBaseUrl()}/products/${variant.product.slug}`;
  type StockAlertWithVariant = (typeof alerts)[0];

  await Promise.all(
    alerts.map((alert: StockAlertWithVariant) =>
      transporter.sendMail({
        from: `"${process.env.BREVO_FROM_NAME}" <${process.env.BREVO_FROM_EMAIL}>`,
        to: alert.email,
        subject: `${productName} (${size}) je spet na zalogi — Leso`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2 style="font-weight:300;letter-spacing:0.1em">LESO</h2>
            <p>Pozdravljeni,</p>
            <p><strong>${productName}</strong> v velikosti <strong>${size}</strong> je spet na zalogi!</p>
            <a href="${productUrl}" style="display:inline-block;background:#1c1917;color:#fff;padding:12px 28px;text-decoration:none;font-size:12px;letter-spacing:0.15em;text-transform:uppercase;margin-top:16px">
              Oglej si izdelek
            </a>
            <p style="margin-top:24px;font-size:12px;color:#999">Leso · Odjava od obvestil ni potrebna, samodejno se izbrišejo ob ponovni zalogi.</p>
          </div>
        `,
      })
    )
  );

  await prisma.stockAlert.deleteMany({ where: { productVariantId: variantId } });
}
