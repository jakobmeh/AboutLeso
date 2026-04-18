import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Si prijazen asistent za spletno trgovino Leso — slovensko modno blagovno znamko. Govoriš slovensko.

Pomagaš kupcem z:
- iskanjem izdelkov (oblačila za moške, ženske, otroke)
- informacijami o velikostih (XS, S, M, L, XL, XXL; otroci: 104–140 cm)
- dostavo, vračili in plačili
- statusom naročila
- navigacijo po trgovini

Informacije o trgovini:
- Dostava: brezplačna nad 80 €, sicer 4,90 €
- Vračila: 14 dni od prejema, nenosljeno in z etiketo
- Plačilo: kreditna kartica, PayPal
- Kategorije: majice, hlače, jakne, puloverji, kratke hlače, kape
- Publika: moški (slug: moski), ženske (slug: zenske), otroci (slug: otroci)

Ko iščeš izdelke, uporabi funkcijo searchProducts.
Ko uporabnik vpraša za status naročila, uporabi funkcijo getOrderStatus.
Odgovarjaj kratko in prijazno. Če ne veš odgovora, povej iskreno.`;

const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "searchProducts",
      description: "Poišči izdelke v trgovini glede na poizvedbo, kategorijo ali publiko",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Iskalni izraz (npr. 'jakna', 'modra majica')" },
          audience: { type: "string", enum: ["moski", "zenske", "otroci"], description: "Ciljna publika: moski, zenske ali otroci" },
          category: { type: "string", description: "Kategorija izdelka" },
          maxPriceEur: { type: "number", description: "Maksimalna cena v EUR" },
          onSale: { type: "boolean", description: "Samo izdelki na popustu/akciji/razprodaji" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getOrderStatus",
      description: "Pridobi status naročila za prijavljenega uporabnika",
      parameters: {
        type: "object",
        properties: {
          orderId: { type: "string", description: "ID naročila (začne se s 'cm')" },
        },
      },
    },
  },
];

async function searchProducts(params: {
  query?: string;
  audience?: string;
  category?: string;
  maxPriceEur?: number;
  onSale?: boolean;
}) {
  const where: Record<string, unknown> = { isActive: true };

  if (params.audience) {
    where.audience = { slug: params.audience };
  }
  if (params.category) {
    where.category = { name: { contains: params.category, mode: "insensitive" } };
  }
  if (params.maxPriceEur) {
    where.priceCents = { lte: params.maxPriceEur * 100 };
  }
  if (params.query) {
    where.name = { contains: params.query, mode: "insensitive" };
  }
  if (params.onSale) {
    where.compareAtPriceCents = { not: null };
  }

  const products = await prisma.product.findMany({
    where,
    take: 5,
    select: {
      name: true,
      slug: true,
      priceCents: true,
      compareAtPriceCents: true,
      audience: { select: { slug: true } },
      category: { select: { name: true } },
      variants: { where: { isActive: true, stock: { gt: 0 } }, select: { size: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (products.length === 0) return "Ni najdenih izdelkov za to poizvedbo.";

  return products
    .map((p) => {
      const price = `${(p.priceCents / 100).toFixed(2)} €`;
      const wasPrice = p.compareAtPriceCents ? ` ~~${(p.compareAtPriceCents / 100).toFixed(2)} €~~` : "";
      const sizes = p.variants.length > 0 ? ` | Velikosti: ${p.variants.map((v) => v.size).join(", ")}` : " | Razprodano";
      return `• **${p.name}** — ${price}${wasPrice}${sizes} | [Oglej si](/products/${p.slug})`;
    })
    .join("\n");
}

async function getOrderStatus(userId: string | null, orderId: string) {
  if (!userId) return "Za ogled statusa naročila se moraš prijaviti.";

  const order = await prisma.order.findFirst({
    where: { id: { startsWith: orderId }, userId },
    select: {
      id: true,
      status: true,
      totalCents: true,
      createdAt: true,
      items: { select: { productName: true, productSize: true, quantity: true } },
    },
  });

  if (!order) return "Naročila s tem ID-jem nisem našel v tvojem računu.";

  const statusMap: Record<string, string> = {
    PENDING: "V obdelavi",
    CONFIRMED: "Potrjeno",
    CANCELLED: "Preklicano",
  };

  return (
    `Naročilo **#${order.id.slice(0, 8)}**\n` +
    `Status: ${statusMap[order.status] ?? order.status}\n` +
    `Skupaj: ${(order.totalCents / 100).toFixed(2)} €\n` +
    `Artikli: ${order.items.map((i) => `${i.productName} (${i.productSize}) ×${i.quantity}`).join(", ")}`
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const { messages } = await req.json();
  if (!Array.isArray(messages)) {
    return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
  }

  const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.slice(-10),
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: chatMessages,
    tools,
    tool_choice: "auto",
    max_tokens: 600,
  });

  const msg = response.choices[0].message;

  if (msg.tool_calls && msg.tool_calls.length > 0) {
    const toolCall = msg.tool_calls[0];
    const args = JSON.parse(toolCall.function.arguments);

    let toolResult = "";
    if (toolCall.function.name === "searchProducts") {
      toolResult = await searchProducts(args);
    } else if (toolCall.function.name === "getOrderStatus") {
      toolResult = await getOrderStatus(userId, args.orderId ?? "");
    }

    const followUp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        ...chatMessages,
        msg,
        { role: "tool", tool_call_id: toolCall.id, content: toolResult },
      ],
      max_tokens: 600,
    });

    return NextResponse.json({ reply: followUp.choices[0].message.content });
  }

  return NextResponse.json({ reply: msg.content });
}
