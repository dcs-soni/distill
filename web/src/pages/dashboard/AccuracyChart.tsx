import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useAccuracyReport } from '../../hooks/use-analytics.js';

export function AccuracyChart() {
  const { data: report, isLoading, isError } = useAccuracyReport();

  if (isLoading) {
    return (
      <div
        className="flex h-96 items-center justify-center rounded-xl border"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
      >
        <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          Loading chart data...
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
        <p className="text-sm text-red-500">Failed to load accuracy report.</p>
      </div>
    );
  }

  const chartData = report.accuracyOverTime.map((pt) => ({
    date: new Date(pt.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    accuracy: Number((pt.accuracy * 100).toFixed(1)),
  }));

  return (
    <div
      className="rounded-xl border p-6"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-foreground)' }}>
            Extraction Accuracy
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            Overall confidence score over time
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>
            {((report.overallAccuracy || 0) * 100).toFixed(1)}%
          </p>
          <p className="text-sm text-green-500">Average</p>
        </div>
      </div>

      <div className="h-[300px] w-full">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
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
                tickFormatter={(value) => `${value}%`}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-card)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-foreground)',
                  borderRadius: '0.5rem',
                }}
                itemStyle={{ color: 'var(--color-primary)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line
                type="monotone"
                dataKey="accuracy"
                name="Confidence Score"
                stroke="var(--color-primary)"
                strokeWidth={3}
                dot={{ r: 4, fill: 'var(--color-primary)' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              No accuracy data available for the selected period.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
