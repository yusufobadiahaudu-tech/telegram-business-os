import { useState } from 'react';
import { Search, UserRound, UserRoundX } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetMembersQueryKey, useDeleteMember, useGetMembers, useUpdateMember } from '@workspace/api-client-react';
import { formatDate, formatMoney, initials } from '@/lib/format';
import { PageHeading, QueryState, Toast } from '@/components/shell';

const statuses = ['all', 'active', 'grace', 'paused', 'churned', 'refunded'] as const;

export default function Members() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<(typeof statuses)[number]>('all');
  const [toast, setToast] = useState('');
  const params = { search: search || undefined, status: filter === 'all' ? undefined : filter };
  const query = useGetMembers(params, { query: { queryKey: getGetMembersQueryKey(params) } });
  const update = useUpdateMember();
  const remove = useDeleteMember();
  const client = useQueryClient();
  const announce = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
  const updateStatus = (id: string, status: string) => update.mutate({ id, data: { status: status as 'active' | 'grace' | 'churned' | 'paused' | 'refunded' } }, { onSuccess: () => { void client.invalidateQueries({ queryKey: getGetMembersQueryKey(params) }); announce('Member access updated'); }, onError: () => announce('Could not update access') });
  const revoke = (id: string, username: string) => { if (!window.confirm(`Revoke access for ${username}?`)) return; remove.mutate({ id }, { onSuccess: () => { void client.invalidateQueries({ queryKey: getGetMembersQueryKey(params) }); announce('Access revoked'); }, onError: () => announce('Could not revoke access') }); };
  return <main className="page-wrap"><PageHeading eyebrow="Community access" title="Members" note="Search, inspect, and keep access records aligned with your Telegram community." /><div className="toolbar"><div className="toolbar-left"><div className="search-wrap"><Search size={14} /><input className="input search-input" aria-label="Search members" data-testid="input-search-members" placeholder="Search username or Telegram ID" value={search} onChange={(event) => setSearch(event.target.value)} /></div><select className="select" aria-label="Filter members by status" data-testid="select-member-status" value={filter} onChange={(event) => setFilter(event.target.value as (typeof statuses)[number])}>{statuses.map((status) => <option key={status} value={status}>{status === 'all' ? 'All access states' : status}</option>)}</select></div><span className="mono">{query.data?.length ?? 0} records</span></div><QueryState isLoading={query.isLoading} isError={query.isError} onRetry={() => void query.refetch()} empty={!query.data?.length} label="members"><div className="card table-card"><div className="table-scroll"><table><thead><tr><th>Member</th><th>Tier</th><th>Access state</th><th>Joined</th><th>Expires</th><th>Value</th><th>Action</th></tr></thead><tbody>{query.data?.map((member) => <tr key={member.id} data-testid={`row-member-${member.id}`}><td><div className="member-cell"><div className="avatar">{initials(member.username)}</div><div><div className="member-name">{member.username}</div><div className="member-handle">ID {member.telegramId}</div></div></div></td><td><span className="mono">{member.tier}</span></td><td><select className="select" style={{ height: 29, padding: '0 7px' }} aria-label={`Update ${member.username} status`} data-testid={`select-member-status-${member.id}`} value={member.status} onChange={(event) => updateStatus(member.id, event.target.value)} disabled={update.isPending}><option value="active">active</option><option value="grace">grace</option><option value="paused">paused</option><option value="churned">churned</option><option value="refunded">refunded</option></select></td><td className="mono">{formatDate(member.joinDate)}</td><td className="mono">{formatDate(member.expiryDate)}</td><td className="amount">{formatMoney(member.amount, member.currency)}</td><td><button className="button button-danger button-compact" data-testid={`button-revoke-member-${member.id}`} onClick={() => revoke(member.id, member.username)} disabled={remove.isPending}><UserRoundX size={13} /> Revoke</button></td></tr>)}</tbody></table></div></div></QueryState><Toast message={toast} /></main>;
}