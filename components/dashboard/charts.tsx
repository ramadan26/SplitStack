"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLocale, useTranslations } from "next-intl";
import { format } from "date-fns";
import { enUS, ar } from "date-fns/locale";
import type { Category } from "@prisma/client";
import { CATEGORY_META } from "@/lib/categories";
import { formatCents } from "@/lib/money";
import type { CategoryTotal, MonthTotal } from "@/lib/data/dashboard";

const CATEGORY_COLORS: Record<Category, string> = {
  FOOD: "#f59e0b",
  TRANSPORT: "#3b82f6",
  HOUSING: "#8b5cf6",
  UTILITIES: "#06b6d4",
  ENTERTAINMENT: "#ec4899",
  SHOPPING: "#f97316",
  OTHER: "#71717a",
};

const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: "1px solid #3f3f46",
  backgroundColor: "#18181b",
  color: "#fafafa",
  fontSize: 13,
} as const;

export function CategoryDonut({ data }: { data: CategoryTotal[] }) {
  const tCat = useTranslations("categories");
  const locale = useLocale();
  const money = (cents: number) => formatCents(cents, "USD", locale);
  const grandTotal = data.reduce((sum, d) => sum + d.total, 0);

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="key"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((d) => (
              <Cell key={d.key} fill={CATEGORY_COLORS[d.key]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => money(Number(value))}
            contentStyle={TOOLTIP_STYLE}
          />
        </PieChart>
      </ResponsiveContainer>

      <ul className="mt-3 space-y-2">
        {data.map((d) => (
          <li key={d.key} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS[d.key] }}
            />
            <span aria-hidden>{CATEGORY_META[d.key].emoji}</span>
            <span className="min-w-0 flex-1 truncate">
              {tCat(d.key.toLowerCase() as "food")}
            </span>
            <span className="shrink-0 font-semibold">{money(d.total)}</span>
            <span className="w-9 shrink-0 text-end text-xs text-zinc-400">
              {Math.round((d.total / grandTotal) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MonthlyBars({ data }: { data: MonthTotal[] }) {
  const locale = useLocale();
  const money = (cents: number) => formatCents(cents, "USD", locale);
  const dateLocale = locale === "ar" ? ar : enUS;

  const rows = data.map((d) => ({
    ...d,
    label: format(new Date(`${d.monthKey}-01`), "MMM", { locale: dateLocale }),
  }));

  return (
    <div className="text-zinc-500 dark:text-zinc-400">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "currentColor", fontSize: 12 }}
          />
          <YAxis hide />
          <Tooltip
            cursor={{ fill: "currentColor", opacity: 0.08 }}
            formatter={(value) => money(Number(value))}
            contentStyle={TOOLTIP_STYLE}
          />
          <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="#10b981" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
