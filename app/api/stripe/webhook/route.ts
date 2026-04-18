import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { createInvoicePdf } from "@/lib/invoice-pdf";
import { getShippingCents } from "@/lib/pricing";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event: import("stripe").Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  type CheckoutSession = { id: string; metadata: Record<string, string> | null; customer_email: string | null; amount_total: number | null };
  const session = event.data.object as unknown as CheckoutSession;
  const { userId, addressId, creatorCode, cartId } = session.metadata ?? {};

  if (!userId || !addressId || !cartId) {
    console.error("Missing metadata in Stripe session:", session.id);
    return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
  }

  // Idempotency — skip if order already created for this session
  const existing = await prisma.order.findFirst({
    where: { stripeSessionId: session.id },
    select: { id: true },
  });
  if (existing) return NextResponse.json({ received: true });

  const shippingAddress = await prisma.userAddress.findUnique({ where: { id: addressId } });
  if (!shippingAddress) return NextResponse.json({ error: "Address not found" }, { status: 400 });

  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: {
          variant: {
            select: {
              id: true, size: true, stock: true,
              product: { select: { id: true, name: true, priceCents: true } },
            },
          },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    console.error("Cart empty or not found for session:", session.id);
    return NextResponse.json({ received: true });
  }

  type CartItemType = (typeof cart.items)[number];

  const subtotalCents = cart.items.reduce(
    (sum: number, item: CartItemType) => sum + item.variant.product.priceCents * item.quantity,
    0
  );

  let creatorCodeRecord = null;
  if (creatorCode) {
    creatorCodeRecord = await prisma.creatorCode.findUnique({
      where: { code: creatorCode, isActive: true },
    });
  }

  const discountCents = creatorCodeRecord
    ? Math.floor((subtotalCents * creatorCodeRecord.discountPercent) / 100)
    : 0;
  const shippingCents = getShippingCents(subtotalCents);
  const totalCents = subtotalCents - discountCents + shippingCents;
  const commissionCents = creatorCodeRecord
    ? Math.floor(((subtotalCents - discountCents) * creatorCodeRecord.commissionPercent) / 100)
    : 0;

  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        userId,
        stripeSessionId: session.id,
        status: "CONFIRMED",
        subtotalCents,
        discountCents,
        shippingCents,
        totalCents,
        shippingLabel: shippingAddress.label,
        shippingFullName: shippingAddress.fullName,
        shippingLine1: shippingAddress.line1,
        shippingLine2: shippingAddress.line2,
        shippingPostalCode: shippingAddress.postalCode,
        shippingCity: shippingAddress.city,
        shippingCountry: shippingAddress.country,
        shippingPhone: shippingAddress.phone,
        creatorCodeId: creatorCodeRecord?.id ?? null,
        commissionCents,
      },
      select: { id: true, createdAt: true },
    });

    await tx.orderItem.createMany({
      data: cart.items.map((item: CartItemType) => ({
        orderId: newOrder.id,
        productId: item.variant.product.id,
        productVariantId: item.variant.id,
        productName: item.variant.product.name,
        productSize: item.variant.size,
        unitPriceCents: item.variant.product.priceCents,
        quantity: item.quantity,
        lineTotalCents: item.variant.product.priceCents * item.quantity,
      })),
    });

    for (const item of cart.items) {
      await tx.productVariant.update({
        where: { id: item.variant.id },
        data: { stock: { decrement: item.quantity } },
      });
      await tx.product.update({
        where: { id: item.variant.product.id },
        data: { stock: { decrement: item.quantity } },
      });
    }

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    return newOrder;
  });

  // Send confirmation email
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  const recipientEmail = dbUser?.email ?? "";
  if (recipientEmail) {
    try {
      let invoiceAttachment: { filename: string; content: Uint8Array } | null = null;
      try {
        const pdfBytes = await createInvoicePdf({
          order: {
            id: order.id, createdAt: order.createdAt,
            subtotalCents, discountCents, shippingCents, totalCents,
            creatorCode: creatorCodeRecord?.code ?? null,
            customerName: dbUser?.name ?? null,
            customerEmail: recipientEmail,
            shippingLabel: shippingAddress.label,
            shippingFullName: shippingAddress.fullName,
            shippingLine1: shippingAddress.line1,
            shippingLine2: shippingAddress.line2,
            shippingPostalCode: shippingAddress.postalCode,
            shippingCity: shippingAddress.city,
            shippingCountry: shippingAddress.country,
            shippingPhone: shippingAddress.phone,
          },
          items: cart.items.map((item: CartItemType) => ({
            productName: item.variant.product.name,
            productSize: item.variant.size,
            quantity: item.quantity,
            unitPriceCents: item.variant.product.priceCents,
            lineTotalCents: item.variant.product.priceCents * item.quantity,
          })),
        });
        invoiceAttachment = { filename: `racun-${order.id.slice(0, 8)}.pdf`, content: pdfBytes };
      } catch (e) {
        console.error("PDF generation failed:", e);
      }

      await sendOrderConfirmationEmail(recipientEmail, {
        orderId: order.id,
        customerName: dbUser?.name ?? null,
        subtotalCents, discountCents, shippingCents, totalCents,
        creatorCode: creatorCodeRecord?.code ?? null,
        invoiceAttachment,
        shippingAddress: {
          label: shippingAddress.label, fullName: shippingAddress.fullName,
          line1: shippingAddress.line1, line2: shippingAddress.line2,
          postalCode: shippingAddress.postalCode, city: shippingAddress.city,
          country: shippingAddress.country, phone: shippingAddress.phone,
        },
        items: cart.items.map((item: CartItemType) => ({
          productName: item.variant.product.name,
          productSize: item.variant.size,
          quantity: item.quantity,
          unitPriceCents: item.variant.product.priceCents,
          lineTotalCents: item.variant.product.priceCents * item.quantity,
        })),
      });
    } catch (e) {
      console.error("Email failed:", e);
    }
  }

  return NextResponse.json({ received: true });
}
