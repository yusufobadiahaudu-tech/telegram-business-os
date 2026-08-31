import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Activity, Bot, CreditCard, LayoutDashboard, Menu, Settings, Users, X, Radio } from 'lucide-react';

const navigation = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/members', label: 'Members', icon: Users },
  { href: '/payments', label: 'Payments', icon: CreditCard },
  { href: '/bot-events', label: 'Bot events', icon: Bot },
];

export function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const current = location.startsWith('/settings') ? 'Settings' : navigation.find((item) => location.startsWith(item.href))?.label ?? 'Overview';
  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand"><div className="brand-mark">tb</div><div><div className="brand-name">Telegram Business OS</div><div className="brand-sub">operator console</div></div></div>
        <div className="nav-label">Workspace</div>
        <nav aria-label="Primary navigation">
          {navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} data-testid={`link-${label.toLowerCase().replace(/\s+/g, '-')}`} className={`nav-link ${location.startsWith(href) ? 'active' : ''}`} onClick={() => setOpen(false)}><Icon className="nav-icon" /><span>{label}</span></Link>)}
        </nav>
        <div className="nav-label" style={{ marginTop: 26 }}>Control room</div>
        <nav>
          <Link href="/settings/observability" data-testid="link-observability" className={`nav-link ${location === '/settings/observability' ? 'active' : ''}`} onClick={() => setOpen(false)}><Activity className="nav-icon" /><span>Observability</span></Link>
          <Link href="/settings" data-testid="link-settings" className={`nav-link ${location === '/settings' ? 'active' : ''}`} onClick={() => setOpen(false)}><Settings className="nav-icon" /><span>Settings</span></Link>
        </nav>
        <div className="sidebar-spacer" />
        <div className="workspace-switcher"><div className="workspace-chip"><div className="workspace-avatar">NS</div><div className="workspace-text"><strong>Northstar Community</strong><span>PRO WORKSPACE</span></div></div></div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><button className="menu-button" aria-label="Open navigation" data-testid="button-open-navigation" onClick={() => setOpen((value) => !value)}>{open ? <X size={20} /> : <Menu size={20} />}</button><div className="crumb"><Radio size={13} /> <span>Northstar Community</span><span>/</span><span className="crumb-current">{current}</span></div></div>
          <div className="topbar-actions"><div className="system-pulse"><span className="pulse-dot" /> Console online</div><div className="workspace-avatar" title="Northstar Community">NS</div></div>
        </header>
        {children}
      </div>
    </div>
  );
}

export function PageHeading({ eyebrow, title, note, action }: { eyebrow: string; title: string; note: string; action?: ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="heading-note">{note}</p></div>{action}</div>;
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={statusClass(status)}>{status}</span>;
}

function statusClass(status: string) {
  return `status-badge status-${status.toLowerCase().replace(/\s+/g, '-')}`;
}

export function LoadingCard({ rows = 3 }: { rows?: number }) {
  return <div className="card card-pad" aria-label="Loading"><div className="skeleton" style={{ width: '38%', height: 14, marginBottom: 19 }} />{Array.from({ length: rows }, (_, index) => <div className="skeleton" key={index} style={{ width: `${92 - index * 9}%`, height: 11, marginTop: 13 }} />)}</div>;
}

export function QueryState({ isLoading, isError, onRetry, children, empty, label }: { isLoading: boolean; isError: boolean; onRetry: () => void; children?: ReactNode; empty?: boolean; label: string }) {
  if (isLoading) return <LoadingCard />;
  if (isError) return <div className="card error-state"><div className="empty-symbol"><Activity size={18} /></div><strong>Could not load {label}</strong><p>The workspace service did not respond. Try again when the connection is ready.</p><button className="button button-primary" data-testid={`button-retry-${label.replace(/\s+/g, '-')}`} onClick={onRetry}>Try again</button></div>;
  if (empty) return <div className="card empty-state"><div className="empty-symbol"><Radio size={18} /></div><strong>No {label} yet</strong><p>There is nothing to show here right now. New activity will appear as soon as it arrives.</p></div>;
  return <>{children}</>;
}

export function Toast({ message }: { message: string }) {
  return message ? <div className="toast-note" role="status" data-testid="status-toast">{message}</div> : null;
}