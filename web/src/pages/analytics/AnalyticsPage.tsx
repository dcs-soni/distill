import { useState } from 'react';
import { Download } from 'lucide-react';
import { AccuracyChart } from '../dashboard/AccuracyChart.js';
import { ThroughputChart } from './ThroughputChart.js';
import { CostTracker } from './CostTracker.js';
import { DashboardPage } from '../dashboard/DashboardPage.js';

type Tab = 'overview' | 'accuracy' | 'throughput' | 'cost' | 'reviewers';

export function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const handleExport = () => {
    // Stubbed export functionality
    alert('Exporting data to CSV...');
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'var(--color-foreground)' }}
          >
            Analytics & Reports
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            Deep dive into platform performance and costs.
          </p>
        </div>

        <div className="mt-4 sm:mt-0 flex space-x-3">
          <select
            className="rounded-md border p-2 text-sm"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-card)',
              color: 'var(--color-foreground)',
            }}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="mb-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {[
            { id: 'overview', name: 'Overview' },
            { id: 'accuracy', name: 'Accuracy' },
            { id: 'throughput', name: 'Throughput' },
            { id: 'cost', name: 'Cost' },
            { id: 'reviewers', name: 'Reviewers' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                activeTab === tab.id
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-muted-foreground)] hover:border-[var(--color-border)] hover:text-[var(--color-foreground)]'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="-mx-auto">
            {/* Reuse DashboardPage but hide its header by wrapping or just render it */}
            <DashboardPage />
          </div>
        )}
        {activeTab === 'accuracy' && <AccuracyChart />}
        {activeTab === 'throughput' && <ThroughputChart />}
        {activeTab === 'cost' && <CostTracker />}
        {activeTab === 'reviewers' && (
          <div
            className="flex h-96 items-center justify-center rounded-xl border"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
          >
            <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              Reviewer metrics coming soon...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
