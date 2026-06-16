import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useThroughputReport } from '../../hooks/use-analytics.js';

export function ThroughputChart() {
  const { data: report, isLoading, isError } = useThroughputReport();

  if (isLoading) {
    return (
      <div
        className="flex h-96 items-center justify-center rounded-xl border"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
      >
        <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          Loading throughput data...
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
        <p className="text-sm text-red-500">Failed to load throughput report.</p>
      </div>
    );
  }

  const chartData = report.throughputOverTime.map((pt) => ({
    date: new Date(pt.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    count: pt.count,
  }));

  const totalDocs = chartData.reduce((sum, pt) => sum + pt.count, 0);

  return (
    <div
      className="rounded-xl border p-6"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-foreground)' }}>
            Processing Throughput
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            Documents processed per day
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>
            {totalDocs.toLocaleString()}
          </p>
          <p className="text-sm text-blue-500">Total in period</p>
        </div>
      </div>

      <div className="h-[300px] w-full">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 5,
                right: 10,
                left: -20,
                bottom: 0,
              }}
            >
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
              />
              <Tooltip
                cursor={{ fill: 'var(--color-muted)' }}
                contentStyle={{
                  backgroundColor: 'var(--color-card)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-foreground)',
                  borderRadius: '0.5rem',
                }}
                itemStyle={{ color: 'var(--color-primary)' }}
              />
              <Bar
                dataKey="count"
                name="Documents Processed"
                fill="var(--color-primary)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              No throughput data available for the selected period.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
