"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getShippingCents } from "@/lib/pricing";
import { getAppBaseUrl } from "@/lib/app-url";

async function requireUser() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");
  return {
    id: userId,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
  };
}

export async function checkoutFromCart(formData: FormData) {
  const user = await requireUser();
  const codeInput = ((formData.get("creatorCode") as string) ?? "").trim().toUpperCase();
  const selectedAddressId = ((formData.get("addressId") as string) ?? "").trim();

  // Validate address
  const shippingAddress = selectedAddressId
    ? await prisma.userAddress.findFirst({ where: { id: selectedAddressId, userId: user.id } })
    : await prisma.userAddress.findFirst({
        where: { userId: user.id },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      });

  if (!shippingAddress) redirect("/cart?addressError=required");

  // Fetch cart
  const cart = await prisma.cart.findUnique({
    where: { userId: user.id },
    include: {
      items: {
        include: {
          variant: {
            select: {
              id: true, size: true, stock: true, isActive: true,
              product: { select: { id: true, name: true, priceCents: true, isActive: true, imageUrl: true } },
            },
          },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) redirect("/cart");

  type CartItemType = (typeof cart.items)[number];

  for (const item of cart.items) {
    if (!item.variant.product.isActive || !item.variant.isActive || item.variant.stock < item.quantity) {
      redirect("/cart?addressError=invalid");
    }
  }

  const subtotalCents = cart.items.reduce(
    (sum: number, item: CartItemType) => sum + item.variant.product.priceCents * item.quantity,
    0
  );

  // Validate creator code
  let creatorCodeRecord = null;
  if (codeInput) {
    const found = await prisma.creatorCode.findUnique({
      where: { code: codeInput, isActive: true },
    });
    if (found) {
      if (found.expiresAt && found.expiresAt < new Date()) {
        // Auto-deactivate expired code
        await prisma.creatorCode.update({ where: { id: found.id }, data: { isActive: false } });
      } else {
        creatorCodeRecord = found;
      }
    }
  }

  const discountCents = creatorCodeRecord
    ? Math.floor((subtotalCents * creatorCodeRecord.discountPercent) / 100)
    : 0;
  const shippingCents = getShippingCents(subtotalCents);

  // Build Stripe line items
  type LineItem = { price_data: { currency: string; product_data: { name: string; images?: string[] }; unit_amount: number }; quantity: number };
  const lineItems: LineItem[] = cart.items.map(
    (item: CartItemType) => ({
      price_data: {
        currency: "eur",
        product_data: {
          name: `${item.variant.product.name} (${item.variant.size})`,
          ...(item.variant.product.imageUrl ? { images: [item.variant.product.imageUrl] } : {}),
        },
        unit_amount: item.variant.product.priceCents,
      },
      quantity: item.quantity,
    })
  );

  // Shipping as line item (if not free)
  if (shippingCents > 0) {
    lineItems.push({
      price_data: {
        currency: "eur",
        product_data: { name: "Dostava" },
        unit_amount: shippingCents,
      },
      quantity: 1,
    });
  }

  // Create Stripe coupon for discount (negative line items are not allowed)
  let stripeCouponId: string | undefined;
  if (discountCents > 0) {
    const coupon = await stripe.coupons.create({
      amount_off: discountCents,
      currency: "eur",
      duration: "once",
      name: `Popust (${creatorCodeRecord!.code})`,
    });
    stripeCouponId = coupon.id;
  }

  const baseUrl = getAppBaseUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    payment_method_types: ["card", "paypal"],
    customer_email: user.email ?? undefined,
    ...(stripeCouponId ? { discounts: [{ coupon: stripeCouponId }] } : {}),
    metadata: {
      userId: user.id,
      addressId: shippingAddress.id,
      creatorCode: codeInput || "",
      cartId: cart.id,
    },
    success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/cart`,
    locale: "sl",
    shipping_address_collection: undefined,
  });

  redirect(session.url!);
}
