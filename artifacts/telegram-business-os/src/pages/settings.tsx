import { useEffect, useRef, useState } from 'react';
import { Bell, Bot, CreditCard, Link2, Save, Settings as SettingsIcon, Webhook } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetSettingsQueryKey, useGetSettings, useUpdateSettings } from '@workspace/api-client-react';
import { PageHeading, QueryState, StatusBadge, Toast } from '@/components/shell';

export default function Settings() {
  const query = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const update = useUpdateSettings();
  const client = useQueryClient();
  const initialized = useRef(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [defaultTier, setDefaultTier] = useState('');
  const [failedEvents, setFailedEvents] = useState(false);
  const [dailySummary, setDailySummary] = useState(false);
  const [toast, setToast] = useState('');
  useEffect(() => {
    if (query.data && !initialized.current) {
      initialized.current = true;
      setWorkspaceName(query.data.workspaceName);
      setDefaultTier(query.data.defaultTier);
      setFailedEvents(query.data.notifications.failedEvents);
      setDailySummary(query.data.notifications.dailySummary);
    }
  }, [query.data]);
  const save = () => update.mutate({ data: { workspaceName, defaultTier, notifications: { failedEvents, dailySummary } } }, { onSuccess: (settings) => { client.setQueryData(getGetSettingsQueryKey(), settings); setToast('Workspace settings saved'); window.setTimeout(() => setToast(''), 2600); }, onError: () => setToast('Settings could not be saved') });
  return <main className="page-wrap"><PageHeading eyebrow="Workspace controls" title="Settings" note="Keep connections, notifications, and defaults aligned with how your team operates." /><QueryState isLoading={query.isLoading} isError={query.isError} onRetry={() => void query.refetch()} label="settings"><div className="settings-layout"><nav className="settings-nav" aria-label="Settings navigation"><a href="#workspace" className="active" data-testid="link-settings-workspace"><SettingsIcon size={14} /> Workspace</a><a href="#connections" data-testid="link-settings-connections"><Link2 size={14} /> Connections</a><a href="#notifications" data-testid="link-settings-notifications"><Bell size={14} /> Notifications</a></nav><div><section className="card settings-section" id="workspace"><div className="eyebrow">Workspace profile</div><h2 className="section-title">The operating defaults</h2><p className="section-kicker">These values shape new access records and outbound messages.</p><div className="form-row"><div className="field"><label htmlFor="workspace-name">Workspace name</label><input id="workspace-name" className="input" data-testid="input-workspace-name" value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} /></div><div className="field"><label htmlFor="default-tier">Default member tier</label><input id="default-tier" className="input" data-testid="input-default-tier" value={defaultTier} onChange={(event) => setDefaultTier(event.target.value)} /></div></div><div className="field" style={{ marginTop: 14 }}><label htmlFor="company-id">Whop company ID</label><input id="company-id" className="input" data-testid="input-whop-company-id" value={query.data?.whopCompanyId ?? ''} readOnly /></div></section><section className="card settings-section" id="connections"><div className="eyebrow">Connection layer</div><h2 className="section-title">Trusted access points</h2><p className="section-kicker">A connection is healthy when it is authenticated and receiving signals.</p><div style={{ marginTop: 19 }}><Connection icon={<CreditCard size={16} />} title="Whop payments" detail={query.data?.whopCompanyId || 'Company not configured'} connected={Boolean(query.data?.whopCompanyId)} /><Connection icon={<Bot size={16} />} title="Telegram bot" detail="Bot token and command routing" connected={query.data?.botConnected ?? false} /><Connection icon={<Webhook size={16} />} title="Webhook receiver" detail="Inbound Telegram event delivery" connected={query.data?.webhookConnected ?? false} /></div></section><section className="card settings-section" id="notifications"><div className="eyebrow">Notification policy</div><h2 className="section-title">What should reach the operator?</h2><p className="section-kicker">Keep interruptions focused on decisions that need a human.</p><div style={{ marginTop: 19 }}><ToggleRow label="Failed bot events" note="Notify when an event needs a manual retry." checked={failedEvents} onChange={setFailedEvents} testId="toggle-failed-events" /><ToggleRow label="Daily operating summary" note="A compact digest of access, revenue, and queue activity." checked={dailySummary} onChange={setDailySummary} testId="toggle-daily-summary" /></div></section><div className="save-bar"><button className="button button-primary" data-testid="button-save-settings" onClick={save} disabled={update.isPending}><Save size={14} /> {update.isPending ? 'Saving…' : 'Save changes'}</button></div></div></div></QueryState><Toast message={toast} /></main>;
}

function Connection({ icon, title, detail, connected }: { icon: React.ReactNode; title: string; detail: string; connected: boolean }) {
  return <div className="connection-row"><div className="connection-copy"><div className="connection-icon">{icon}</div><div><strong>{title}</strong><span>{detail}</span></div></div><StatusBadge status={connected ? 'healthy' : 'paused'} /></div>;
}

function ToggleRow({ label, note, checked, onChange, testId }: { label: string; note: string; checked: boolean; onChange: (value: boolean) => void; testId: string }) {
  return <div className="toggle-row"><div className="toggle-copy"><strong>{label}</strong><span>{note}</span></div><input className="toggle" type="checkbox" aria-label={label} data-testid={testId} checked={checked} onChange={(event) => onChange(event.target.checked)} /></div>;
}