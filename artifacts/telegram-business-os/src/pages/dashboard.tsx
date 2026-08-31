import { ArrowUpRight, BarChart3, Bot, CheckCircle2, Clock3, CreditCard, Database, Users } from 'lucide-react';
import { getGetActivityQueryKey, getGetDashboardQueryKey, getHealthCheckQueryKey, type DashboardOverview, useGetActivity, useGetDashboard, useHealthCheck } from '@workspace/api-client-react';
import { formatMoney, formatTime } from '@/lib/format';
import { PageHeading, QueryState, StatusBadge } from '@/components/shell';

export default function Dashboard() {
  const dashboard = useGetDashboard({ query: { queryKey: getGetDashboardQueryKey() } });
  const activity = useGetActivity({ query: { queryKey: getGetActivityQueryKey() } });
  const health = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey() } });
  const overview = dashboard.data;
  const metrics = overview?.metrics;
  const maxRevenue = Math.max(...(overview?.revenue?.map((point) => point.amount) ?? [1]), 1);
  return <main className="page-wrap">
    <PageHeading eyebrow="Workspace overview" title="Good morning, operator." note="A clear read on your community, money movement, and automation queue." action={<button className="button button-primary" data-testid="button-refresh-dashboard" onClick={() => { void dashboard.refetch(); void activity.refetch(); void health.refetch(); }}><ArrowUpRight size={14} /> Refresh signal</button>} />
    <QueryState isLoading={dashboard.isLoading} isError={dashboard.isError} onRetry={() => void dashboard.refetch()} label="workspace overview">
      {overview && <><div className="metric-grid">
        <Metric label="Active members" value={metrics?.activeMembers.toLocaleString() ?? '—'} icon={<Users size={15} />} foot={<><span className="delta-up">+{metrics?.membersDelta ?? 0}</span> this month</>} />
        <Metric label="Monthly revenue" value={formatMoney(metrics?.monthlyRevenue ?? 0)} icon={<CreditCard size={15} />} foot={<><span className="delta-up">+{metrics?.revenueDelta ?? 0}%</span> vs last month</>} />
        <Metric label="Pending events" value={(metrics?.pendingEvents ?? 0).toLocaleString()} icon={<Clock3 size={15} />} foot="waiting in queue" />
        <Metric label="Failed events" value={(metrics?.failedEvents ?? 0).toLocaleString()} icon={<Bot size={15} />} foot={metrics?.failedEvents ? <span className="delta-down">Needs attention</span> : 'No intervention needed'} />
      </div>
      <div className="dashboard-grid">
        <section className="card" data-testid="card-revenue-chart"><div className="card-header"><div><h2 className="section-title">Revenue pulse</h2><p className="section-kicker">Last 7 reporting periods</p></div><BarChart3 size={17} color="hsl(189 72% 43%)" /></div><div className="chart">{overview.revenue.map((point) => <div className="chart-col" key={point.label}><span className="chart-amount">{formatMoney(point.amount, 'USD').replace('.00', '')}</span><div className="chart-bar" style={{ height: `${Math.max((point.amount / maxRevenue) * 145, 7)}px` }} /><span className="chart-label">{point.label}</span></div>)}</div></section>
        <HealthPanel overview={overview} serverStatus={health.data?.status} />
      </div>
      <div className="split-grid">
        <section className="card"><div className="card-header"><div><h2 className="section-title">Queue balance</h2><p className="section-kicker">Event throughput at a glance</p></div><Database size={17} color="hsl(189 72% 43%)" /></div><div className="card-pad"><QueueRow label="Pending" value={overview.queue.pending} color="hsl(var(--chart-2))" total={Math.max(overview.queue.pending + overview.queue.processing + overview.queue.completed + overview.queue.failed, 1)} /><QueueRow label="Processing" value={overview.queue.processing} color="hsl(var(--chart-4))" total={Math.max(overview.queue.pending + overview.queue.processing + overview.queue.completed + overview.queue.failed, 1)} /><QueueRow label="Completed" value={overview.queue.completed} color="hsl(var(--chart-3))" total={Math.max(overview.queue.pending + overview.queue.processing + overview.queue.completed + overview.queue.failed, 1)} /><QueueRow label="Failed" value={overview.queue.failed} color="hsl(var(--chart-5))" total={Math.max(overview.queue.pending + overview.queue.processing + overview.queue.completed + overview.queue.failed, 1)} /></div></section>
         <section className="card"><div className="card-header"><div><h2 className="section-title">Recent activity</h2><p className="section-kicker">The latest workspace signals</p></div><StatusBadge status={overview.health.status} /></div><QueryState isLoading={activity.isLoading} isError={activity.isError} onRetry={() => void activity.refetch()} empty={!activity.data?.length} label="activity">{activity.data && <ActivityList items={activity.data.slice(0, 4)} />}</QueryState></section>
      </div></>}
    </QueryState>
  </main>;
}

function Metric({ label, value, icon, foot }: { label: string; value: string; icon: React.ReactNode; foot: React.ReactNode }) {
  return <div className="card metric-card" data-testid={`metric-${label.toLowerCase().replace(/\s+/g, '-')}`}><div className="metric-top">{icon}{label}</div><div className="metric-value">{value}</div><div className="metric-foot">{foot}</div></div>;
}

function HealthPanel({ overview, serverStatus }: { overview: DashboardOverview; serverStatus?: string }) {
  return <section className="card card-pad health-card" data-testid="card-system-health"><div><h2 className="section-title">System health</h2><p className="section-kicker">The connection layer is being watched</p></div><div className="health-row"><span>Workspace access</span><span className="health-value"><span className="pulse-dot" />{overview.workspace.connected ? 'Connected' : 'Disconnected'}</span></div><div className="health-row"><span>Worker status</span><span className="health-value">{overview.health.workerStatus || serverStatus || 'Unknown'}</span></div><div className="health-row"><span>Webhook latency</span><span className="health-value">{overview.health.webhookLatency} ms</span></div><div className="health-row"><span>Last webhook</span><span className="health-value">{formatTime(overview.health.lastWebhook)}</span></div></section>;
}

function QueueRow({ label, value, color, total }: { label: string; value: number; color: string; total: number }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '82px 1fr 38px', gap: 11, alignItems: 'center', marginBottom: 17 }}><span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{label}</span><div className="meter-track"><div className="meter-fill" style={{ width: `${Math.max(value / total * 100, value ? 4 : 0)}%`, background: color }} /></div><span className="mono" style={{ textAlign: 'right' }}>{value}</span></div>;
}

function ActivityList({ items }: { items: Array<{ id: string; title: string; description: string; timestamp: string; status: string }> }) {
  return <div className="activity-list">{items.map((item) => <div className="activity-item" key={item.id}><div className="activity-icon"><CheckCircle2 size={14} /></div><div className="activity-copy"><div className="activity-title">{item.title}</div><div className="activity-desc">{item.description}</div></div><div className="activity-time">{formatTime(item.timestamp)}</div></div>)}</div>;
}