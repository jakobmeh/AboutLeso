"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { createInvoicePdf } from "@/lib/invoice-pdf";
import { getShippingCents } from "@/lib/pricing";

async function requireUser() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

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

  const shippingAddress = selectedAddressId
    ? await prisma.userAddress.findFirst({
        where: { id: selectedAddressId, userId: user.id },
        select: {
          label: true,
          fullName: true,
          line1: true,
          line2: true,
          postalCode: true,
          city: true,
          country: true,
          phone: true,
        },
      })
    : await prisma.userAddress.findFirst({
        where: { userId: user.id },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        select: {
          label: true,
          fullName: true,
          line1: true,
          line2: true,
          postalCode: true,
          city: true,
          country: true,
          phone: true,
        },
      });

  if (!shippingAddress) {
    redirect("/cart?addressError=required");
  }

  const checkoutResult = await prisma.$transaction(async (tx) => {
    const cart = await tx.cart.findUnique({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            variant: {
              select: {
                id: true,
                size: true,
                stock: true,
                isActive: true,
                product: {
                  select: {
                    id: true,
                    name: true,
                    priceCents: true,
                    isActive: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new Error("Cart is empty.");
    }

    for (const item of cart.items) {
      if (!item.variant.product.isActive) {
        throw new Error(`Product ${item.variant.product.name} is inactive.`);
      }
      if (!item.variant.isActive) {
        throw new Error(`Size ${item.variant.size} for ${item.variant.product.name} is inactive.`);
      }
      if (item.variant.stock < item.quantity) {
        throw new Error(`Not enough stock for ${item.variant.product.name} (${item.variant.size}).`);
      }
    }

    type CartItemType = (typeof cart.items)[number];
    const subtotalCents = cart.items.reduce(
      (sum: number, item: CartItemType) => sum + item.variant.product.priceCents * item.quantity,
      0
    );

    let creatorCodeRecord = null;
    if (codeInput) {
      creatorCodeRecord = await tx.creatorCode.findUnique({
        where: { code: codeInput, isActive: true },
      });
    }

    const discountCents = creatorCodeRecord
      ? Math.floor((subtotalCents * creatorCodeRecord.discountPercent) / 100)
      : 0;
    const discountedSubtotalCents = subtotalCents - discountCents;
    const shippingCents = getShippingCents(subtotalCents);
    const totalCents = discountedSubtotalCents + shippingCents;
    const commissionCents = creatorCodeRecord
      ? Math.floor((discountedSubtotalCents * creatorCodeRecord.commissionPercent) / 100)
      : 0;

    const order = await tx.order.create({
      data: {
        userId: user.id,
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
        orderId: order.id,
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

    await tx.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return {
      orderId: order.id,
      orderCreatedAt: order.createdAt,
      subtotalCents,
      discountCents,
      shippingCents,
      totalCents,
      creatorCode: creatorCodeRecord?.code ?? null,
      shippingAddress: {
        label: shippingAddress.label,
        fullName: shippingAddress.fullName,
        line1: shippingAddress.line1,
        line2: shippingAddress.line2,
        postalCode: shippingAddress.postalCode,
        city: shippingAddress.city,
        country: shippingAddress.country,
        phone: shippingAddress.phone,
      },
      items: cart.items.map((item: CartItemType) => ({
        productName: item.variant.product.name,
        productSize: item.variant.size,
        quantity: item.quantity,
        unitPriceCents: item.variant.product.priceCents,
        lineTotalCents: item.variant.product.priceCents * item.quantity,
      })),
    };
  });

  let recipientEmail = user.email?.trim() ?? "";
  if (!recipientEmail) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true },
    });
    recipientEmail = dbUser?.email ?? "";
  }

  if (recipientEmail) {
    try {
      let invoiceAttachment: { filename: string; content: Uint8Array } | null = null;

      try {
        const pdfBytes = await createInvoicePdf({
          order: {
            id: checkoutResult.orderId,
            createdAt: checkoutResult.orderCreatedAt,
            subtotalCents: checkoutResult.subtotalCents,
            discountCents: checkoutResult.discountCents,
            shippingCents: checkoutResult.shippingCents,
            totalCents: checkoutResult.totalCents,
            creatorCode: checkoutResult.creatorCode,
            customerName: user.name,
            customerEmail: recipientEmail,
            shippingLabel: checkoutResult.shippingAddress.label,
            shippingFullName: checkoutResult.shippingAddress.fullName,
            shippingLine1: checkoutResult.shippingAddress.line1,
            shippingLine2: checkoutResult.shippingAddress.line2,
            shippingPostalCode: checkoutResult.shippingAddress.postalCode,
            shippingCity: checkoutResult.shippingAddress.city,
            shippingCountry: checkoutResult.shippingAddress.country,
            shippingPhone: checkoutResult.shippingAddress.phone,
          },
          items: checkoutResult.items,
        });

        invoiceAttachment = {
          filename: `racun-${checkoutResult.orderId.slice(0, 8)}.pdf`,
          content: pdfBytes,
        };
      } catch (error) {
        console.error("Invoice PDF attachment generation failed:", error);
      }

      await sendOrderConfirmationEmail(recipientEmail, {
        orderId: checkoutResult.orderId,
        customerName: user.name,
        subtotalCents: checkoutResult.subtotalCents,
        discountCents: checkoutResult.discountCents,
        shippingCents: checkoutResult.shippingCents,
        totalCents: checkoutResult.totalCents,
        creatorCode: checkoutResult.creatorCode,
        invoiceAttachment,
        shippingAddress: checkoutResult.shippingAddress,
        items: checkoutResult.items,
      });
    } catch (error) {
      console.error("Order confirmation email failed:", error);
    }
  }

  revalidatePath("/products");
  revalidatePath("/cart");
  revalidatePath("/orders");
  revalidatePath("/admin");
  revalidatePath("/creator");

  redirect(`/orders?success=1&orderId=${checkoutResult.orderId}`);
}
