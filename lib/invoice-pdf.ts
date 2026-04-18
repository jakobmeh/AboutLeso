import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb } from "pdf-lib";

type InvoiceItem = {
  productName: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
};

type InvoiceOrder = {
  id: string;
  createdAt: Date;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  creatorCode?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  shippingLabel?: string | null;
  shippingFullName?: string | null;
  shippingLine1?: string | null;
  shippingLine2?: string | null;
  shippingPostalCode?: string | null;
  shippingCity?: string | null;
  shippingCountry?: string | null;
  shippingPhone?: string | null;
};

export type InvoicePdfInput = {
  order: InvoiceOrder;
  items: InvoiceItem[];
};

type FontLike = {
  widthOfTextAtSize: (value: string, size: number) => number;
};

type FontBytes = {
  regular: Uint8Array;
  bold: Uint8Array;
};

type SellerInfo = {
  name: string;
  line1: string;
  line2: string;
  country: string;
  taxId: string;
  registrationNo?: string;
  email: string;
  iban?: string;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_LEFT = 44;
const PAGE_RIGHT = 44;
const PAGE_TOP = 44;
const PAGE_BOTTOM = 44;
const ROW_HEIGHT = 16;

const globalForInvoiceFonts = globalThis as unknown as {
  invoiceFontBytes?: Promise<FontBytes>;
};

function getSellerInfo(): SellerInfo {
  return {
    name: process.env.INVOICE_COMPANY_NAME?.trim() || "Leso d.o.o.",
    line1: process.env.INVOICE_COMPANY_LINE1?.trim() || "Trgovska cesta 10",
    line2: process.env.INVOICE_COMPANY_LINE2?.trim() || "3000 Celje",
    country: process.env.INVOICE_COMPANY_COUNTRY?.trim() || "Slovenija",
    taxId: process.env.INVOICE_COMPANY_TAX_ID?.trim() || "SI00000000",
    registrationNo: process.env.INVOICE_COMPANY_REG_NO?.trim() || undefined,
    email:
      process.env.INVOICE_COMPANY_EMAIL?.trim() ||
      process.env.BREVO_FROM_EMAIL?.trim() ||
      "info@leso.si",
    iban: process.env.INVOICE_COMPANY_IBAN?.trim() || undefined,
  };
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("sl-SI", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat("sl-SI", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function formatDiscount(cents: number) {
  if (cents <= 0) return formatPrice(0);
  return `- ${formatPrice(cents)}`;
}

function getInvoiceNumber(order: InvoiceOrder) {
  const year = order.createdAt.getFullYear();
  return `${year}-${order.id.slice(0, 8).toUpperCase()}`;
}

function cleanText(value: string) {
  return value.replaceAll(/\s+/g, " ").trim();
}

function wrapText(text: string, maxWidth: number, font: FontLike, size: number) {
  const safe = cleanText(text);
  if (!safe) return [] as string[];

  const words = safe.split(" ");
  const lines: string[] = [];
  let current = words[0] ?? "";

  for (const word of words.slice(1)) {
    const candidate = `${current} ${word}`.trim();
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }

    lines.push(current);
    current = word;
  }

  if (current) lines.push(current);
  return lines;
}

async function loadFontBytes() {
  if (!globalForInvoiceFonts.invoiceFontBytes) {
    globalForInvoiceFonts.invoiceFontBytes = (async () => {
      const regularPath = path.join(process.cwd(), "assets", "fonts", "NotoSans-Regular.ttf");
      const boldPath = path.join(process.cwd(), "assets", "fonts", "NotoSans-Bold.ttf");

      const [regular, bold] = await Promise.all([readFile(regularPath), readFile(boldPath)]);
      return {
        regular: regular as Uint8Array,
        bold: bold as Uint8Array,
      };
    })();
  }

  return globalForInvoiceFonts.invoiceFontBytes;
}

export async function createInvoicePdf(input: InvoicePdfInput) {
  const seller = getSellerInfo();

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const fontBytes = await loadFontBytes();
  const fontRegular = await pdfDoc.embedFont(fontBytes.regular, { subset: true });
  const fontBold = await pdfDoc.embedFont(fontBytes.bold, { subset: true });

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - PAGE_TOP;

  const contentWidth = PAGE_WIDTH - PAGE_LEFT - PAGE_RIGHT;

  const drawLine = (lineY: number, tint = 0.86) => {
    page.drawLine({
      start: { x: PAGE_LEFT, y: lineY },
      end: { x: PAGE_WIDTH - PAGE_RIGHT, y: lineY },
      color: rgb(tint, tint, tint),
      thickness: 1,
    });
  };

  const drawLeft = (
    value: string,
    x: number,
    drawY: number,
    size = 11,
    bold = false,
    color = rgb(0.12, 0.12, 0.12)
  ) => {
    const font = bold ? fontBold : fontRegular;
    page.drawText(cleanText(value), { x, y: drawY, size, font, color });
  };

  const drawRight = (
    value: string,
    rightX: number,
    drawY: number,
    size = 11,
    bold = false,
    color = rgb(0.12, 0.12, 0.12)
  ) => {
    const safe = cleanText(value);
    const font = bold ? fontBold : fontRegular;
    const textWidth = font.widthOfTextAtSize(safe, size);
    page.drawText(safe, { x: rightX - textWidth, y: drawY, size, font, color });
  };

  const ensureSpace = (height: number) => {
    if (y - height >= PAGE_BOTTOM) return false;
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - PAGE_TOP;
    return true;
  };

  const detailsColumnGap = 26;
  const detailsColumnWidth = (contentWidth - detailsColumnGap) / 2;

  const tableQuantityX = PAGE_LEFT + 300;
  const tableUnitRightX = PAGE_LEFT + 430;
  const tableTotalRightX = PAGE_WIDTH - PAGE_RIGHT;
  const tableProductWidth = tableQuantityX - PAGE_LEFT - 16;

  const totalsLabelRightX = PAGE_WIDTH - PAGE_RIGHT - 140;
  const totalsValueRightX = PAGE_WIDTH - PAGE_RIGHT;

  const drawTableHeader = () => {
    ensureSpace(26);
    drawLine(y + 8, 0.86);
    drawLeft("Izdelek", PAGE_LEFT, y - 2, 10, true, rgb(0.35, 0.35, 0.35));
    drawLeft("Količina", tableQuantityX, y - 2, 10, true, rgb(0.35, 0.35, 0.35));
    drawRight("Cena/kos", tableUnitRightX, y - 2, 10, true, rgb(0.35, 0.35, 0.35));
    drawRight("Skupaj", tableTotalRightX, y - 2, 10, true, rgb(0.35, 0.35, 0.35));
    y -= 20;
  };

  const invoiceNumber = getInvoiceNumber(input.order);

  drawLeft(seller.name, PAGE_LEFT, y, 26, true);

  const sellerHeaderLines = [seller.line1, seller.line2, seller.country].filter(Boolean);
  sellerHeaderLines.forEach((line, index) => {
    drawLeft(line, PAGE_LEFT, y - 18 - index * 14, 10, false, rgb(0.35, 0.35, 0.35));
  });

  const headerRight = PAGE_WIDTH - PAGE_RIGHT;
  drawRight("Račun", headerRight, y + 2, 22, true);
  drawRight(`Številka: ${invoiceNumber}`, headerRight, y - 18, 11, false, rgb(0.35, 0.35, 0.35));
  drawRight(
    `Datum izdaje: ${formatDate(input.order.createdAt)}`,
    headerRight,
    y - 34,
    11,
    false,
    rgb(0.35, 0.35, 0.35)
  );
  drawRight(`Referenca: ${input.order.id}`, headerRight, y - 50, 10, false, rgb(0.45, 0.45, 0.45));

  y -= 74;
  drawLine(y, 0.83);
  y -= 22;

  drawLeft("Podatki prodajalca", PAGE_LEFT, y, 11, true);
  drawRight("Podatki kupca", PAGE_WIDTH - PAGE_RIGHT, y, 11, true);
  y -= 18;

  const sellerDetailLines = [
    seller.name,
    seller.line1,
    seller.line2,
    seller.country,
    `Davčna: ${seller.taxId}`,
    seller.registrationNo ? `Matična: ${seller.registrationNo}` : "",
    `E-pošta: ${seller.email}`,
    seller.iban ? `IBAN: ${seller.iban}` : "",
  ].filter((line) => line.length > 0);

  const customerDetailRaw = [
    input.order.customerName || "Brez imena",
    input.order.customerEmail ? `E-pošta: ${input.order.customerEmail}` : "",
    input.order.shippingLabel || "",
    input.order.shippingFullName || "",
    input.order.shippingLine1 || "",
    input.order.shippingLine2 || "",
    [input.order.shippingPostalCode, input.order.shippingCity].filter(Boolean).join(" "),
    input.order.shippingCountry || "",
    input.order.shippingPhone ? `Tel: ${input.order.shippingPhone}` : "",
  ].filter((line) => line.length > 0);

  const sellerDetails = sellerDetailLines.flatMap((line) =>
    wrapText(line, detailsColumnWidth, fontRegular, 10.5)
  );
  const customerDetails = customerDetailRaw.flatMap((line) =>
    wrapText(line, detailsColumnWidth, fontRegular, 10.5)
  );

  const maxDetailRows = Math.max(sellerDetails.length, customerDetails.length, 1);

  for (let i = 0; i < maxDetailRows; i += 1) {
    ensureSpace(ROW_HEIGHT);

    const leftLine = sellerDetails[i];
    const rightLine = customerDetails[i];

    if (leftLine) drawLeft(leftLine, PAGE_LEFT, y, 10.5);
    if (rightLine) drawRight(rightLine, PAGE_WIDTH - PAGE_RIGHT, y, 10.5);

    y -= ROW_HEIGHT;
  }

  y -= 4;
  drawLine(y, 0.86);
  y -= 18;

  drawTableHeader();

  for (const item of input.items) {
    const itemNameLines = wrapText(item.productName, tableProductWidth, fontRegular, 11);
    const rowLines = Math.max(itemNameLines.length, 1);
    const rowHeight = rowLines * ROW_HEIGHT + 10;

    const newPageForRow = ensureSpace(rowHeight + 10);
    if (newPageForRow) {
      drawTableHeader();
    }

    const rowTopY = y;

    itemNameLines.forEach((line, index) => {
      drawLeft(line, PAGE_LEFT, rowTopY - index * ROW_HEIGHT, 11);
    });

    drawLeft(String(item.quantity), tableQuantityX, rowTopY, 11);
    drawRight(formatPrice(item.unitPriceCents), tableUnitRightX, rowTopY, 11);
    drawRight(formatPrice(item.lineTotalCents), tableTotalRightX, rowTopY, 11);

    y -= rowHeight;
  }

  drawLine(y + 8, 0.9);
  y -= 12;
  ensureSpace(120);

  drawRight("Vmesni znesek", totalsLabelRightX, y, 11);
  drawRight(formatPrice(input.order.subtotalCents), totalsValueRightX, y, 11);
  y -= 18;

  drawRight("Popust", totalsLabelRightX, y, 11);
  drawRight(formatDiscount(input.order.discountCents), totalsValueRightX, y, 11);
  y -= 18;

  drawRight("Dostava", totalsLabelRightX, y, 11);
  drawRight(
    input.order.shippingCents === 0 ? "Brezplačno" : formatPrice(input.order.shippingCents),
    totalsValueRightX,
    y,
    11
  );
  y -= 24;

  drawLine(y + 10, 0.86);
  drawRight("Skupaj", totalsLabelRightX, y - 6, 13, true);
  drawRight(formatPrice(input.order.totalCents), totalsValueRightX, y - 6, 13, true);
  y -= 28;

  if (input.order.creatorCode) {
    drawLeft(`Uporabljena koda: ${input.order.creatorCode}`, PAGE_LEFT, y, 10.5, false, rgb(0.32, 0.32, 0.32));
    y -= 16;
  }

  drawLeft("Način plačila: spletno naročilo", PAGE_LEFT, y, 10.5, false, rgb(0.32, 0.32, 0.32));
  y -= 22;

  const footerY = Math.max(PAGE_BOTTOM + 14, y - 8);
  drawLine(footerY, 0.86);
  drawLeft("Hvala za nakup. Za vprašanja nam pišite na podporo.", PAGE_LEFT, footerY - 16, 10, false, rgb(0.4, 0.4, 0.4));

  return pdfDoc.save();
}
