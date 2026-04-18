export type VariantStockInput = {
  size: string;
  stock: number;
};

function normalizeSize(value: string) {
  return value.trim().toUpperCase();
}

export function parseVariantStocksInput(input: string, fallbackStock = 0): VariantStockInput[] {
  const raw = input.trim();
  if (!raw) {
    return [{ size: "UNI", stock: Math.max(0, Math.floor(fallbackStock)) }];
  }

  const entries = raw
    .split(/[,;\n]+/g)
    .map((part) => part.trim())
    .filter(Boolean);

  if (entries.length === 0) {
    return [{ size: "UNI", stock: Math.max(0, Math.floor(fallbackStock)) }];
  }

  const bySize = new Map<string, number>();

  for (const entry of entries) {
    const [sizeRaw, stockRaw] = entry.split(/[:=]/, 2).map((value) => value?.trim() ?? "");
    const size = normalizeSize(sizeRaw);
    const stockNumber = Number(stockRaw);

    if (!size) {
      throw new Error("Velikost manjka.");
    }
    if (size.length > 20) {
      throw new Error(`Velikost "${size}" je predolga.`);
    }
    if (!Number.isInteger(stockNumber) || stockNumber < 0) {
      throw new Error(`Zaloga za velikost "${size}" ni veljavno celo število >= 0.`);
    }

    bySize.set(size, stockNumber);
  }

  if (bySize.size === 0) {
    return [{ size: "UNI", stock: Math.max(0, Math.floor(fallbackStock)) }];
  }

  return [...bySize.entries()].map(([size, stock]) => ({ size, stock }));
}

export function formatVariantStocks(variants: { size: string; stock: number }[]) {
  return variants
    .map((variant) => `${normalizeSize(variant.size)}:${variant.stock}`)
    .join(", ");
}

export function totalVariantStock(variants: { stock: number }[]) {
  return variants.reduce((sum, variant) => sum + variant.stock, 0);
}
