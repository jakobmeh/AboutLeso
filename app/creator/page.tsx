import { redirect } from "next/navigation";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { Role } from "@/app/generated/prisma/client";
import { PrintButton } from "./PrintButton";

function formatPrice(cents: number) {
  return new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("sl-SI", { dateStyle: "medium" }).format(date);
}

function BarChart({
  data,
  barColor = "#292524",
}: {
  data: { label: string; value: number }[];
  barColor?: string;
}) {
  if (data.every((d) => d.value === 0)) {
    return <p className="py-6 text-center text-sm text-stone-400">Še ni podatkov.</p>;
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  const W = 500, H = 120, PB = 20;
  const chartH = H - PB;
  const barStep = W / Math.max(data.length, 1);
  const barW = Math.max(8, barStep - 8);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden="true">
      <line x1={0} y1={chartH} x2={W} y2={chartH} stroke="#e7e5e4" />
      {data.map((d, i) => {
        const bh = d.value > 0 ? Math.max(2, (d.value / max) * chartH) : 0;
        const x = i * barStep + (barStep - barW) / 2;
        return (
          <g key={i}>
            <rect x={x} y={chartH - bh} width={barW} height={bh} fill={barColor} rx="1" />
            <text x={x + barW / 2} y={H - 4} textAnchor="middle" fontSize="9" fill="#a8a29e">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default async function CreatorPage() {
  const session = await requireRole([Role.CREATOR]);

  const creatorCode = await prisma.creatorCode.findUnique({
    where: { userId: session.user.id },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { email: true, name: true } },
        },
      },
    },
  });

  if (!creatorCode) {
    redirect("/");
  }

  type OrderWithUser = (typeof creatorCode.orders)[0];

  const totalCommissionCents = creatorCode.orders.reduce(
    (sum: number, o: OrderWithUser) => sum + o.commissionCents,
    0
  );
  const totalOrdersCents = creatorCode.orders.reduce(
    (sum: number, o: OrderWithUser) => sum + (o.subtotalCents - o.discountCents),
    0
  );

  // Monthly chart data — last 6 months
  const monthlyData: { label: string; earningsCents: number; orderCount: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    monthlyData.push({
      label: d.toLocaleDateString("sl-SI", { month: "short" }),
      earningsCents: 0,
      orderCount: 0,
    });
  }
  for (const o of creatorCode.orders) {
    const d = new Date(o.createdAt);
    const label = new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString("sl-SI", { month: "short" });
    const month = monthlyData.find((m) => m.label === label);
    if (month) {
      month.earningsCents += o.commissionCents;
      month.orderCount++;
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Print header - only visible when printing */}
      <div className="hidden print:block mb-8">
        <h1 className="text-2xl font-light tracking-widest uppercase">Leso — Kreator poročilo</h1>
        <p className="text-sm text-stone-500 mt-1">
          Koda: {creatorCode.code} · Generirano: {formatDate(new Date())}
        </p>
      </div>

      {/* Screen header */}
      <div className="border-b border-stone-200 bg-stone-50 print:hidden">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-xs tracking-widest uppercase text-stone-400">Kreator panel</p>
          <h1 className="mt-1 text-3xl font-light tracking-wide text-stone-900">
            {session.user.name ?? session.user.email}
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-10 space-y-10">
        {/* Code info */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="border border-stone-200 p-5">
            <p className="text-xs tracking-widest uppercase text-stone-400">Vaša koda</p>
            <p className="mt-2 text-2xl font-mono font-medium text-stone-900">{creatorCode.code}</p>
          </div>
          <div className="border border-stone-200 p-5">
            <p className="text-xs tracking-widest uppercase text-stone-400">Popust za kupce</p>
            <p className="mt-2 text-2xl font-light text-stone-900">{creatorCode.discountPercent}%</p>
          </div>
          <div className="border border-stone-200 p-5">
            <p className="text-xs tracking-widest uppercase text-stone-400">Skupaj naročil</p>
            <p className="mt-2 text-2xl font-light text-stone-900">{creatorCode.orders.length}</p>
          </div>
          <div className="border border-stone-200 p-5">
            <p className="text-xs tracking-widest uppercase text-stone-400">Zasluženo</p>
            <p className="mt-2 text-2xl font-light text-green-700">{formatPrice(totalCommissionCents)}</p>
          </div>
        </section>

        {/* Summary row */}
        <section className="border border-stone-200 p-5 flex flex-wrap gap-8">
          <div>
            <p className="text-xs tracking-widest uppercase text-stone-400">Skupaj promet (po popustu)</p>
            <p className="mt-1 text-lg font-light text-stone-800">{formatPrice(totalOrdersCents)}</p>
          </div>
          <div>
            <p className="text-xs tracking-widest uppercase text-stone-400">Vaša provizija</p>
            <p className="mt-1 text-lg font-light text-stone-800">{creatorCode.commissionPercent}% od vsake prodaje</p>
          </div>
          <div>
            <p className="text-xs tracking-widest uppercase text-stone-400">Status kode</p>
            <p className={`mt-1 text-xs tracking-widest uppercase font-medium ${creatorCode.isActive ? "text-green-700" : "text-red-500"}`}>
              {creatorCode.isActive ? "Aktivna" : "Neaktivna"}
            </p>
          </div>
          <div className="ml-auto self-center print:hidden">
            <PrintButton />
          </div>
        </section>

        {/* Monthly charts */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 print:hidden">
          <div className="border border-stone-200 p-5">
            <p className="text-xs tracking-widest uppercase text-stone-400 mb-4">Mesečni zaslužek</p>
            <BarChart
              data={monthlyData.map((m) => ({ label: m.label, value: m.earningsCents }))}
              barColor="#15803d"
            />
          </div>
          <div className="border border-stone-200 p-5">
            <p className="text-xs tracking-widest uppercase text-stone-400 mb-4">Mesečno število naročil</p>
            <BarChart
              data={monthlyData.map((m) => ({ label: m.label, value: m.orderCount }))}
              barColor="#292524"
            />
          </div>
        </section>

        {/* Orders table */}
        <section>
          <h2 className="text-xs tracking-widest uppercase text-stone-400 mb-4">Naročila z vašo kodo</h2>
          {creatorCode.orders.length === 0 ? (
            <p className="text-sm text-stone-400 py-8 text-center border border-stone-100">
              Še nihče ni uporabil vaše kode.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-xs tracking-widest uppercase text-stone-400">
                    <th className="py-3 pr-4 font-medium">Datum</th>
                    <th className="py-3 pr-4 font-medium">Naročilo</th>
                    <th className="py-3 pr-4 font-medium">Kupec</th>
                    <th className="py-3 pr-4 font-medium text-right">Vrednost</th>
                    <th className="py-3 pr-4 font-medium text-right">Popust</th>
                    <th className="py-3 font-medium text-right">Vaš zaslužek</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {creatorCode.orders.map((order: OrderWithUser) => (
                    <tr key={order.id}>
                      <td className="py-3 pr-4 text-stone-500">{formatDate(order.createdAt)}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-stone-600">{order.id.slice(0, 12)}…</td>
                      <td className="py-3 pr-4 text-stone-700">{order.user.name ?? order.user.email}</td>
                      <td className="py-3 pr-4 text-right text-stone-800">
                        {formatPrice(order.subtotalCents - order.discountCents)}
                      </td>
                      <td className="py-3 pr-4 text-right text-stone-500">{formatPrice(order.discountCents)}</td>
                      <td className="py-3 text-right font-medium text-green-700">{formatPrice(order.commissionCents)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-stone-200 font-medium">
                    <td colSpan={3} className="py-3 pr-4 text-xs tracking-widest uppercase text-stone-500">Skupaj</td>
                    <td className="py-3 pr-4 text-right text-stone-900">{formatPrice(totalOrdersCents)}</td>
                    <td className="py-3 pr-4 text-right text-stone-500">
                      {formatPrice(creatorCode.orders.reduce((s: number, o: OrderWithUser) => s + o.discountCents, 0))}
                    </td>
                    <td className="py-3 text-right text-green-700">{formatPrice(totalCommissionCents)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>
      </div>

      <style>{`
        @media print {
          @page { margin: 20mm; }
          body { font-size: 12px; }
        }
      `}</style>
    </div>
  );
}
