import { AlertTriangle, Bot, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetBotEventsQueryKey, useGetBotEvents, useRetryBotEvent } from '@workspace/api-client-react';
import { formatTime, initials } from '@/lib/format';
import { PageHeading, QueryState, StatusBadge, Toast } from '@/components/shell';

const eventStatuses = ['all', 'pending', 'processing', 'completed', 'failed'] as const;

export default function BotEvents() {
  const [status, setStatus] = useState<(typeof eventStatuses)[number]>('all');
  const [toast, setToast] = useState('');
  const params = { status: status === 'all' ? undefined : status };
  const query = useGetBotEvents(params, { query: { queryKey: getGetBotEventsQueryKey(params) } });
  const retry = useRetryBotEvent();
  const client = useQueryClient();
  const retryEvent = (id: string) => retry.mutate({ id }, { onSuccess: () => { void client.invalidateQueries({ queryKey: getGetBotEventsQueryKey(params) }); setToast('Event returned to the queue'); window.setTimeout(() => setToast(''), 2600); }, onError: () => setToast('Retry could not be queued') });
  const failed = query.data?.filter((event) => event.status === 'failed').length ?? 0;
  return <main className="page-wrap"><PageHeading eyebrow="Automation queue" title="Bot events" note="Understand what the bot is doing now and move failed work forward safely." /><div className="metric-grid" style={{ marginBottom: 14 }}><div className="card metric-card"><div className="metric-top"><Bot size={15} /> Visible events</div><div className="metric-value">{query.data?.length ?? '—'}</div><div className="metric-foot">in the selected view</div></div><div className="card metric-card"><div className="metric-top"><AlertTriangle size={15} /> Failed events</div><div className="metric-value">{failed}</div><div className="metric-foot">{failed ? <span className="delta-down">Retry recommended</span> : 'Queue is clear'}</div></div></div><div className="toolbar"><div className="toolbar-left"><select className="select" aria-label="Filter bot events by status" data-testid="select-event-status" value={status} onChange={(event) => setStatus(event.target.value as (typeof eventStatuses)[number])}>{eventStatuses.map((item) => <option key={item} value={item}>{item === 'all' ? 'All event states' : item}</option>)}</select></div><span className="mono">Live queue</span></div><QueryState isLoading={query.isLoading} isError={query.isError} onRetry={() => void query.refetch()} empty={!query.data?.length} label="bot events"><div className="card table-card"><div className="table-scroll"><table><thead><tr><th>Member</th><th>Event</th><th>Status</th><th>Retries</th><th>Last error</th><th>Updated</th><th /></tr></thead><tbody>{query.data?.map((event) => <tr key={event.id} data-testid={`row-bot-event-${event.id}`}><td><div className="member-cell"><div className="avatar">{initials(event.memberUsername)}</div><div><div className="member-name">{event.memberUsername}</div><div className="member-handle">ID {event.telegramId}</div></div></div></td><td className="mono">{event.eventType}</td><td><StatusBadge status={event.status} /></td><td className="mono">{event.retryCount}</td><td style={{ maxWidth: 230, color: 'hsl(var(--muted-foreground))' }}>{event.lastError || '—'}</td><td className="mono">{formatTime(event.updatedAt)}</td><td>{event.status === 'failed' && <button className="button button-compact button-primary" data-testid={`button-retry-event-${event.id}`} onClick={() => retryEvent(event.id)} disabled={retry.isPending}><RotateCcw size={12} /> Retry</button>}</td></tr>)}</tbody></table></div></div></QueryState><Toast message={toast} /></main>;
}