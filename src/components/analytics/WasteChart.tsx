import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SeriesPoint } from '@/lib/analytics';

interface Props {
  data: SeriesPoint[];
  bucket: 'day' | 'week' | 'month';
}

export default function WasteChart({ data, bucket }: Props) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        bucket_start: new Date(d.bucket_start).getTime(),
        kg_avoided: Number(d.kg_avoided.toFixed(2)),
        kg_wasted: Number(d.kg_wasted.toFixed(2)),
      })),
    [data],
  );

  const allZero = chartData.every((d) => d.kg_avoided === 0 && d.kg_wasted === 0);

  return (
    <div className="rounded-3xl border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold">Trend</h2>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-primary" /> Avoided
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-destructive/70" /> Wasted
          </span>
        </div>
      </div>

      <div className="h-48 w-full">
        {allZero ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No data in this period yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="g-avoid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="g-waste" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="bucket_start"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(t) => fmtTick(t, bucket)}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                minTickGap={20}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                width={32}
                tickFormatter={(v) => `${v}`}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 12,
                  fontSize: 12,
                }}
                labelFormatter={(t) => fmtFullLabel(Number(t), bucket)}
                formatter={(v: number, name: string) => [
                  `${v.toFixed(1)} kg`,
                  name === 'kg_avoided' ? 'Avoided' : 'Wasted',
                ]}
              />
              <Area
                type="monotone"
                dataKey="kg_wasted"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                fill="url(#g-waste)"
              />
              <Area
                type="monotone"
                dataKey="kg_avoided"
                stroke="hsl(var(--primary))"
                strokeWidth={2.2}
                fill="url(#g-avoid)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function fmtTick(t: number, bucket: 'day' | 'week' | 'month') {
  const d = new Date(t);
  if (bucket === 'month') return d.toLocaleDateString(undefined, { month: 'short' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function fmtFullLabel(t: number, bucket: 'day' | 'week' | 'month') {
  const d = new Date(t);
  if (bucket === 'month')
    return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  if (bucket === 'week') {
    const end = new Date(d);
    end.setDate(end.getDate() + 6);
    return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  }
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
