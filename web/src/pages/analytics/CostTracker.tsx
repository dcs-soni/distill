import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useCostReport } from '../../hooks/use-analytics.js';

export function CostTracker() {
  const { data: report, isLoading, isError } = useCostReport();

  if (isLoading) {
    return (
      <div
        className="flex h-96 items-center justify-center rounded-xl border"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
      >
        <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          Loading cost data...
        </p>
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div
        className="flex h-96 items-center justify-center rounded-xl border"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
      >
        <p className="text-sm text-red-500">Failed to load cost report.</p>
      </div>
    );
  }

  const chartData = report.costOverTime.map((pt) => ({
    ...pt,
    date: new Date(pt.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  }));

  // Identify all unique providers dynamically
  const providers = new Set<string>();
  report.costOverTime.forEach((pt) => {
    Object.keys(pt).forEach((key) => {
      if (key !== 'date' && key !== 'total') {
        providers.add(key);
      }
    });
  });

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  const providerColors: Record<string, string> = {};
  Array.from(providers).forEach((p, idx) => {
    providerColors[p] = colors[idx % colors.length];
  });

  return (
    <div
      className="rounded-xl border p-6"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-foreground)' }}>
            Cost Tracker
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            Cost over time by AI Provider (USD)
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>
            ${report.totalCost.toFixed(2)}
          </p>
          <p className="text-sm text-blue-500">Total Cost</p>
        </div>
      </div>

      <div className="h-[300px] w-full">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{
                top: 5,
                right: 10,
                left: -20,
                bottom: 0,
              }}
            >
              <defs>
                {Array.from(providers).map((provider) => (
                  <linearGradient
                    key={provider}
                    id={`color${provider}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor={providerColors[provider]} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={providerColors[provider]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis
                dataKey="date"
                stroke="var(--color-muted-foreground)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                stroke="var(--color-muted-foreground)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => `$${value}`}
              />
              <Tooltip
                cursor={{ stroke: 'var(--color-muted)', strokeWidth: 1 }}
                contentStyle={{
                  backgroundColor: 'var(--color-card)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-foreground)',
                  borderRadius: '0.5rem',
                }}
                formatter={(value: any, name: any) => [
                  `$${Number(value).toFixed(4)}`,
                  String(name),
                ]}
              />
              <Legend verticalAlign="top" height={36} />
              {Array.from(providers).map((provider) => (
                <Area
                  key={provider}
                  type="monotone"
                  dataKey={provider}
                  stackId="1"
                  stroke={providerColors[provider]}
                  fillOpacity={1}
                  fill={`url(#color${provider})`}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              No cost data available for the selected period.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
