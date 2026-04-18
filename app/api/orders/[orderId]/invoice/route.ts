import { Role } from "@/app/generated/prisma/client";
import { auth } from "@/auth";
import { createInvoicePdf } from "@/lib/invoice-pdf";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await params;
    const parsedOrderId = orderId.trim();

    if (!parsedOrderId) {
      return Response.json({ error: "Missing order id" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: parsedOrderId },
      include: {
        items: { orderBy: { createdAt: "asc" } },
        creatorCode: { select: { code: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!order) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }

    const isOwner = order.userId === userId;
    const isAdmin = session.user.role === Role.ADMIN;

    if (!isOwner && !isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const pdfBytes = await createInvoicePdf({
      order: {
        id: order.id,
        createdAt: order.createdAt,
        subtotalCents: order.subtotalCents,
        discountCents: order.discountCents,
        shippingCents: order.shippingCents,
        totalCents: order.totalCents,
        creatorCode: order.creatorCode?.code ?? null,
        customerName: order.user.name,
        customerEmail: order.user.email,
        shippingLabel: order.shippingLabel,
        shippingFullName: order.shippingFullName,
        shippingLine1: order.shippingLine1,
        shippingLine2: order.shippingLine2,
        shippingPostalCode: order.shippingPostalCode,
        shippingCity: order.shippingCity,
        shippingCountry: order.shippingCountry,
        shippingPhone: order.shippingPhone,
      },
      items: order.items.map((item: (typeof order.items)[0]) => ({
        productName: item.productName,
        productSize: item.productSize,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        lineTotalCents: item.lineTotalCents,
      })),
    });

    const filename = `racun-${order.id.slice(0, 8)}.pdf`;

    const pdfBuffer = Buffer.from(pdfBytes);

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store, no-cache, max-age=0",
      },
    });
  } catch (error) {
    console.error("Invoice PDF generation failed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
