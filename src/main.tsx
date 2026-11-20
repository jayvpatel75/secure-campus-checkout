import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Archive,
  ArrowUpRight,
  AudioLines,
  Camera,
  Check,
  CheckCheck,
  ChevronRight,
  ClipboardList,
  Clock3,
  Laptop,
  LayoutGrid,
  LogOut,
  Package,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import './styles.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import '@fontsource/manrope/latin-700.css';
import '@fontsource/manrope/latin-800.css';

type User = { id: string; name: string; email: string; role: 'student' | 'staff' | 'admin' };
type Item = {
  id: string;
  name: string;
  category: string;
  asset_tag: string;
  description: string;
  status: string;
};
type Loan = {
  id: string;
  equipment_name: string;
  asset_tag: string;
  category: string;
  borrower: string;
  borrower_email: string;
  purpose: string;
  status: string;
  due_date: string;
  user_id: string;
  created_at: string;
};
type Audit = { id: string; actor: string; action: string; detail: string; created_at: string };
let csrf = '';
async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Unable to complete this request.');
  return data;
}
const label = (value: string) =>
  value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const date = (value: string) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
    new Date(value),
  );
const icons: Record<string, typeof Laptop> = {
  Laptops: Laptop,
  Cameras: Camera,
  Audio: AudioLines,
  Accessories: Package,
};
function Badge({ status }: { status: string }) {
  return (
    <span className={`badge ${status}`}>
      <span aria-hidden="true" />
      {label(status)}
    </span>
  );
}
function EquipmentArt({ category }: { category: string }) {
  if (category === 'Laptops')
    return (
      <svg viewBox="0 0 300 160" aria-hidden="true">
        <defs>
          <linearGradient id="screen" x2="1" y2="1">
            <stop stopColor="#143c40" />
            <stop offset="1" stopColor="#598d8b" />
          </linearGradient>
        </defs>
        <rect x="74" y="19" width="152" height="102" rx="8" fill="#29383d" />
        <rect x="80" y="25" width="140" height="89" rx="3" fill="url(#screen)" />
        <path d="M80 114L180 25h40v89" fill="#93b5a9" opacity=".4" />
        <circle cx="150" cy="22" r="1.5" fill="#aabec2" />
        <path d="M74 121h152l29 16q0 7-12 7H57q-12 0-12-7z" fill="#a4b4b7" />
        <path d="M45 137h210" stroke="#778d93" strokeWidth="3" />
        <path d="M127 123h46l7 7h-60z" fill="#758e94" />
      </svg>
    );
  if (category === 'Cameras')
    return (
      <svg viewBox="0 0 300 160" aria-hidden="true">
        <path
          d="M93 49l12-16h37l8 16h55q11 0 11 11v66q0 10-11 10H87q-10 0-10-10V59q0-10 16-10"
          fill="#34484c"
        />
        <rect x="79" y="61" width="29" height="65" rx="5" fill="#26383d" />
        <rect x="171" y="37" width="30" height="13" rx="3" fill="#1e3338" />
        <circle cx="154" cy="91" r="46" fill="#152a30" stroke="#6c8385" strokeWidth="4" />
        <circle cx="154" cy="91" r="33" fill="#294f54" stroke="#0f252b" strokeWidth="5" />
        <circle cx="154" cy="91" r="23" fill="#15343e" />
        <circle cx="146" cy="83" r="10" fill="#709b9b" opacity=".6" />
        <circle cx="200" cy="62" r="4" fill="#d9d6b9" />
      </svg>
    );
  if (category === 'Audio')
    return (
      <svg viewBox="0 0 300 160" aria-hidden="true">
        <path
          d="M124 35l-22-14 8-14 28 22m38 6l22-14-8-14-28 22"
          fill="#8eaaa8"
          stroke="#45656a"
          strokeWidth="3"
        />
        <rect x="119" y="31" width="62" height="117" rx="12" fill="#294348" />
        <rect x="127" y="49" width="46" height="35" rx="4" fill="#a8c7bb" />
        <path
          d="M132 72l5-10 5 14 7-18 8 12 5-7 6 8"
          fill="none"
          stroke="#40675c"
          strokeWidth="2"
        />
        <circle cx="150" cy="105" r="12" fill="#102c34" />
        <circle cx="150" cy="105" r="5" fill="#a5bab8" />
        <circle cx="134" cy="132" r="4" fill="#c5a786" />
        <circle cx="166" cy="132" r="4" fill="#789a96" />
      </svg>
    );
  return (
    <svg viewBox="0 0 300 160" aria-hidden="true">
      <rect x="102" y="54" width="96" height="65" rx="12" fill="#426368" />
      <rect x="108" y="60" width="84" height="53" rx="8" fill="#66898a" />
      <path d="M150 54V36q0-15 20-15h22" fill="none" stroke="#29454b" strokeWidth="7" />
      <rect x="190" y="14" width="19" height="14" rx="3" fill="#334e53" />
      <rect x="117" y="77" width="25" height="13" rx="2" fill="#19383e" />
      <rect x="152" y="78" width="24" height="10" rx="2" fill="#c7d6cf" />
      <path d="M117 101h58" stroke="#294c51" strokeWidth="3" />
      <ellipse cx="150" cy="137" rx="59" ry="5" fill="#234248" opacity=".12" />
    </svg>
  );
}
function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: React.ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = ref.current!;
    const previous = document.activeElement as HTMLElement;
    node.showModal();
    return () => {
      node.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      aria-labelledby="modal-title"
    >
      <div className="modal-head">
        <h2 id="modal-title">{title}</h2>
        <button className="icon-button" aria-label="Close dialog" onClick={close}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function Login({ demo, signedIn }: { demo: boolean; signedIn: (user: User) => void }) {
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <main className="login-page">
      <section className="login-story">
        <div className="brand">
          <span className="brand-mark">
            <Archive />
          </span>
          CampusKit<span className="brand-period">.</span>
        </div>
        <div>
          <span className="eyebrow">THE TOOLS TO DO MORE</span>
          <h1>
            Big ideas.
            <br />
            The right equipment.
          </h1>
          <p>
            Borrow what you need. Build something great.
            <br />
            Your campus equipment, all in one place.
          </p>
          <div className="login-art">
            <EquipmentArt category="Laptops" />
            <EquipmentArt category="Cameras" />
          </div>
        </div>
        <span className="story-footer">
          <ShieldCheck size={18} /> Secure access. Accountable lending.
        </span>
      </section>
      <section className="login-form">
        <div className="login-inner">
          <span className="eyebrow">CAMPUS EQUIPMENT SERVICES</span>
          <h2>Welcome back</h2>
          <p className="muted">Sign in to explore equipment and manage your loans.</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError('');
              try {
                const result = await api<{ user: User; csrf: string }>('/login', 'POST', {
                  email,
                  password,
                });
                csrf = result.csrf;
                signedIn(result.user);
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Email address
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@campus.example"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="primary wide" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          {demo && (
            <div className="demo-panel">
              <strong>Explore the local demo</strong>
              <p>Fictional accounts. Choose a role, then sign in.</p>
              <div className="demo-buttons">
                {['student', 'staff', 'admin'].map((role) => (
                  <button
                    key={role}
                    className="secondary"
                    onClick={() => {
                      setEmail(`${role}@campus.example`);
                      setPassword('CampusDemo!2026');
                    }}
                  >
                    {label(role)}
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="login-foot">Need access? Contact your equipment services administrator.</p>
        </div>
      </section>
    </main>
  );
}
function App() {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [demo, setDemo] = useState(false),
    [initialError, setInitialError] = useState('');
  const [view, setView] = useState('catalog'),
    [items, setItems] = useState<Item[]>([]),
    [loans, setLoans] = useState<Loan[]>([]),
    [events, setEvents] = useState<Audit[]>([]);
  const [query, setQuery] = useState(''),
    [category, setCategory] = useState('All equipment'),
    [available, setAvailable] = useState(false),
    [loanFilter, setLoanFilter] = useState('all');
  const [requestItem, setRequestItem] = useState<Item | null>(null),
    [adding, setAdding] = useState(false),
    [notice, setNotice] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false);
  const privileged = !!user && user.role !== 'student';
  async function session() {
    try {
      const s = await api<{ user: User | null; csrf: string; demo: boolean }>('/session');
      csrf = s.csrf;
      setUser(s.user);
      setDemo(s.demo);
    } catch (err) {
      setInitialError((err as Error).message);
    } finally {
      setReady(true);
    }
  }
  async function refresh() {
    setLoading(true);
    try {
      const [equipment, requests] = await Promise.all([
        api<Item[]>('/equipment'),
        api<Loan[]>('/loans'),
      ]);
      setItems(equipment);
      setLoans(requests);
      if (privileged) setEvents(await api<Audit[]>('/audit'));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void session();
  }, []);
  useEffect(() => {
    if (user) void refresh();
  }, [user]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  async function mutate(path: string, method: string, body: unknown, message: string) {
    setBusy(true);
    setError('');
    try {
      await api(path, method, body);
      setNotice(message);
      await refresh();
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  if (!ready) return <main className="loading">Loading CampusKit…</main>;
  if (initialError)
    return (
      <main className="loading">
        <p role="alert">{initialError}</p>
        <button onClick={() => location.reload()}>Try again</button>
      </main>
    );
  if (!user) return <Login demo={demo} signedIn={setUser} />;
  const visible = items.filter(
    (item) =>
      (category === 'All equipment' || item.category === category) &&
      (!available || item.status === 'available') &&
      `${item.name} ${item.asset_tag} ${item.description}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const active = loans.filter((l) => ['approved', 'checked_out'].includes(l.status));
  const pending = loans.filter((l) => l.status === 'pending');
  const today = new Date().toISOString().slice(0, 10);
  const overdue = active.filter((l) => l.due_date.slice(0, 10) < today);
  const nav = [
    { id: 'catalog', text: 'Equipment catalog', icon: LayoutGrid },
    { id: 'loans', text: privileged ? 'Checkout requests' : 'My requests', icon: ClipboardList },
    ...(privileged ? [{ id: 'activity', text: 'Activity log', icon: ShieldCheck }] : []),
  ];
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setView('catalog');
          }}
        >
          <span className="brand-mark">
            <Archive size={22} />
          </span>
          CampusKit<span className="brand-period">.</span>
        </a>
        <div className="workspace-label">EQUIPMENT SERVICES</div>
        <nav aria-label="Main navigation">
          {nav.map(({ id, text, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${view === id ? 'selected' : ''}`}
              aria-current={view === id ? 'page' : undefined}
              onClick={() => {
                setView(id);
                setError('');
              }}
            >
              <Icon size={19} />
              {text}
              {id === 'loans' && pending.length > 0 && (
                <span className="nav-count">{pending.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <ShieldCheck size={23} />
            <strong>Thoughtful borrowing.</strong>
            <p>
              Keep campus resources moving. Return your equipment on time and ready for the next
              idea.
            </p>
          </div>
          <div className="profile">
            <span className="avatar">
              {user.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </span>
            <div>
              <strong>{user.name}</strong>
              <span>{label(user.role)} account</span>
            </div>
            <button
              aria-label="Sign out"
              className="signout"
              onClick={async () => {
                try {
                  await api('/logout', 'POST', {});
                  setUser(null);
                  setItems([]);
                  setLoans([]);
                  setEvents([]);
                  setView('catalog');
                  setQuery('');
                  setCategory('All equipment');
                  setAvailable(false);
                  setNotice('');
                  setError('');
                  await session();
                } catch (err) {
                  setError((err as Error).message);
                }
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>
            Workspace <ChevronRight size={14} />{' '}
            <strong>{nav.find((n) => n.id === view)?.text}</strong>
          </span>
          <div className="topbar-right">
            {demo && <span className="demo-tag">LOCAL DEMO</span>}
            <span className="secure-label">
              <ShieldCheck size={16} /> Secure campus access
            </span>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          <div className="page-title">
            <div>
              <span className="eyebrow">CAMPUS RESOURCES, CONNECTED</span>
              <h1>
                {view === 'catalog'
                  ? 'Make your next idea happen.'
                  : view === 'loans'
                    ? privileged
                      ? 'Every request. One place.'
                      : 'Your equipment, organized.'
                    : 'A clear record of every action.'}
              </h1>
              <p>
                {view === 'catalog'
                  ? 'Discover and borrow the tools for your next class, project, or big idea.'
                  : view === 'loans'
                    ? 'Follow requests from approval to pickup and return.'
                    : 'Review sign-ins, inventory changes, and the complete lending trail.'}
              </p>
            </div>
            {view === 'catalog' && user.role === 'admin' && (
              <button className="primary" onClick={() => setAdding(true)}>
                <Plus size={17} /> Add equipment
              </button>
            )}
          </div>
          {notice && (
            <div className="notice" role="status">
              <CheckCheck size={18} />
              {notice}
            </div>
          )}
          {error && (
            <div className="error-banner" role="alert">
              {error}
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={() => setError('')}
              >
                <X size={18} />
              </button>
            </div>
          )}
          <section className="stats" aria-label="Equipment summary">
            <div>
              <span className="stat-icon mint">
                <Package size={21} />
              </span>
              <div>
                <span>Available equipment</span>
                <strong>
                  {items.filter((i) => i.status === 'available').length}
                  <small> / {items.length} items</small>
                </strong>
              </div>
            </div>
            <div>
              <span className="stat-icon blue">
                <ClipboardList size={21} />
              </span>
              <div>
                <span>{privileged ? 'Active checkouts' : 'Your active loans'}</span>
                <strong>
                  {active.length}
                  <small> {active.length === 1 ? 'item' : 'items'} in use or reserved</small>
                </strong>
              </div>
            </div>
            <div>
              <span className="stat-icon gold">
                <Clock3 size={21} />
              </span>
              <div>
                <span>Pending requests</span>
                <strong>
                  {pending.length}
                  <small> awaiting review</small>
                </strong>
              </div>
            </div>
            <div>
              <span className={`stat-icon ${overdue.length ? 'rose' : 'mint'}`}>
                <ShieldCheck size={21} />
              </span>
              <div>
                <span>Return status</span>
                <strong className="stat-text">
                  {overdue.length ? `${overdue.length} overdue` : 'On track'}
                  <small>
                    {overdue.length ? ' Please arrange a return' : ' No overdue equipment'}
                  </small>
                </strong>
              </div>
            </div>
          </section>
          {view === 'catalog' && (
            <>
              <section className="feature-banner">
                <div className="banner-icon">
                  <Sparkles size={23} />
                </div>
                <div>
                  <strong>A little curiosity. A lot of possibility.</strong>
                  <p>From your first recording to your final presentation, we’ve got your kit.</p>
                </div>
                <span className="banner-chip">Borrow for up to 14 days</span>
              </section>
              <section aria-labelledby="catalog-title">
                <div className="section-heading">
                  <h2 id="catalog-title">
                    Explore equipment <span>{items.length}</span>
                  </h2>
                  <span className="muted small">Picked for campus life.</span>
                </div>
                <div className="catalog-toolbar">
                  <div className="tabs" aria-label="Equipment category">
                    {['All equipment', 'Laptops', 'Cameras', 'Audio', 'Accessories'].map((c) => (
                      <button
                        key={c}
                        className={category === c ? 'active' : ''}
                        aria-pressed={category === c}
                        onClick={() => setCategory(c)}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <label className="search">
                    <Search size={17} />
                    <span className="sr-only">Search equipment</span>
                    <input
                      placeholder="Search equipment…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                </div>
                <div className="results-line">
                  <span>
                    {loading
                      ? 'Updating…'
                      : `${visible.length} ${visible.length === 1 ? 'item' : 'items'} to explore`}
                  </span>
                  <label className="available-toggle">
                    <SlidersHorizontal size={15} />
                    <input
                      type="checkbox"
                      checked={available}
                      onChange={(e) => setAvailable(e.target.checked)}
                    />{' '}
                    Available only
                  </label>
                </div>
                <div className="equipment-grid">
                  {visible.map((item) => (
                    <article className="equipment-card" key={item.id}>
                      <div className={`equipment-art ${item.category.toLowerCase()}`}>
                        <span className="asset-tag">{item.asset_tag}</span>
                        <EquipmentArt category={item.category} />
                      </div>
                      <div className="equipment-body">
                        <div className="item-category">
                          {React.createElement(icons[item.category] ?? Package, { size: 13 })}
                          {item.category}
                        </div>
                        <h3>{item.name}</h3>
                        <p>{item.description}</p>
                        <div className="card-footer">
                          <Badge status={item.status} />
                          <button
                            className="request-button"
                            disabled={
                              busy ||
                              item.status !== 'available' ||
                              loans.some(
                                (l) =>
                                  l.asset_tag === item.asset_tag &&
                                  ['pending', 'approved', 'checked_out'].includes(l.status),
                              )
                            }
                            onClick={() => {
                              setError('');
                              setRequestItem(item);
                            }}
                          >
                            {loans.some(
                              (l) => l.asset_tag === item.asset_tag && l.status === 'pending',
                            )
                              ? 'Requested'
                              : item.status === 'available'
                                ? 'Request item'
                                : 'Unavailable'}
                            {item.status === 'available' && <Plus size={15} />}
                          </button>
                        </div>
                        {user.role === 'admin' &&
                          ['available', 'maintenance'].includes(item.status) && (
                            <button
                              disabled={busy}
                              className="maintenance-button"
                              onClick={() =>
                                void mutate(
                                  `/equipment/${item.id}`,
                                  'PATCH',
                                  {
                                    status:
                                      item.status === 'available' ? 'maintenance' : 'available',
                                  },
                                  'Equipment availability updated.',
                                )
                              }
                            >
                              {item.status === 'maintenance'
                                ? 'Mark available'
                                : 'Send for maintenance'}
                            </button>
                          )}
                      </div>
                    </article>
                  ))}
                </div>
                {visible.length === 0 && (
                  <div className="empty-state">
                    <Search size={30} />
                    <h3>No equipment found</h3>
                    <p>Try a different search or category.</p>
                    <button
                      className="secondary"
                      onClick={() => {
                        setQuery('');
                        setCategory('All equipment');
                        setAvailable(false);
                      }}
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </section>
              <div className="catalog-footer">
                <ShieldCheck size={16} />
                <span>Every checkout has a clear trail. Your requests stay private.</span>
              </div>
            </>
          )}
          {view === 'loans' && (
            <section className="panel">
              <div className="section-heading">
                <h2>{privileged ? 'Checkout requests' : 'My requests'}</h2>
                <label className="filter-select">
                  <span className="sr-only">Filter requests by status</span>
                  <select value={loanFilter} onChange={(e) => setLoanFilter(e.target.value)}>
                    {[
                      'all',
                      'pending',
                      'approved',
                      'checked_out',
                      'returned',
                      'denied',
                      'cancelled',
                    ].map((s) => (
                      <option key={s} value={s}>
                        {s === 'all' ? 'All statuses' : label(s)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="request-list">
                {loans
                  .filter((l) => loanFilter === 'all' || l.status === loanFilter)
                  .map((loan) => (
                    <article className="loan-row" key={loan.id} data-loan-id={loan.id}>
                      <span className="loan-icon">
                        {React.createElement(icons[loan.category] ?? Package, { size: 24 })}
                      </span>
                      <div className="loan-detail">
                        <h3>
                          {loan.equipment_name} <small>{loan.asset_tag}</small>
                        </h3>
                        {privileged && (
                          <p className="borrower">
                            {loan.borrower} · {loan.borrower_email}
                          </p>
                        )}
                        <p>{loan.purpose}</p>
                        <span className="small muted">
                          Return by {date(loan.due_date)}
                          {loan.due_date.slice(0, 10) < today &&
                          ['approved', 'checked_out'].includes(loan.status)
                            ? ' · Overdue'
                            : ''}
                        </span>
                      </div>
                      <div className="loan-actions">
                        <Badge status={loan.status} />
                        <div>
                          {privileged && loan.status === 'pending' && (
                            <>
                              <button
                                className="secondary"
                                disabled={busy}
                                onClick={() =>
                                  void mutate(
                                    `/loans/${loan.id}/action`,
                                    'POST',
                                    { action: 'deny' },
                                    'Request denied.',
                                  )
                                }
                              >
                                Deny
                              </button>
                              <button
                                className="primary"
                                disabled={busy || loan.user_id === user.id}
                                onClick={() =>
                                  void mutate(
                                    `/loans/${loan.id}/action`,
                                    'POST',
                                    { action: 'approve' },
                                    'Request approved. Equipment reserved.',
                                  )
                                }
                              >
                                Approve
                              </button>
                            </>
                          )}
                          {privileged && loan.status === 'approved' && (
                            <button
                              className="primary"
                              disabled={busy}
                              onClick={() =>
                                void mutate(
                                  `/loans/${loan.id}/action`,
                                  'POST',
                                  { action: 'checkout' },
                                  'Pickup recorded. Equipment checked out.',
                                )
                              }
                            >
                              Record pickup
                            </button>
                          )}
                          {privileged && loan.status === 'checked_out' && (
                            <button
                              className="primary"
                              disabled={busy}
                              onClick={() =>
                                void mutate(
                                  `/loans/${loan.id}/action`,
                                  'POST',
                                  { action: 'return' },
                                  'Return recorded. Equipment is available again.',
                                )
                              }
                            >
                              Record return
                            </button>
                          )}
                          {['pending', 'approved'].includes(loan.status) && (
                            <button
                              className="text-button"
                              disabled={busy}
                              onClick={() =>
                                void mutate(
                                  `/loans/${loan.id}/action`,
                                  'POST',
                                  { action: 'cancel' },
                                  'Request cancelled.',
                                )
                              }
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
              </div>
              {!loans.filter((l) => loanFilter === 'all' || l.status === loanFilter).length && (
                <div className="empty-state">
                  <ClipboardList size={30} />
                  <h3>No requests here yet</h3>
                  <p>Requests matching this status will appear here.</p>
                  <button className="secondary" onClick={() => setView('catalog')}>
                    Explore equipment
                  </button>
                </div>
              )}
            </section>
          )}
          {view === 'activity' && privileged && (
            <section className="panel">
              <div className="section-heading">
                <h2>Activity log</h2>
                <span className="muted small">Latest 200 events · times in your timezone</span>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Event</th>
                      <th scope="col">Actor</th>
                      <th scope="col">Detail</th>
                      <th scope="col">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <tr key={event.id}>
                        <td>
                          <span className="event-label">
                            <Check size={14} />
                            {label(event.action)}
                          </span>
                        </td>
                        <td>{event.actor}</td>
                        <td>{event.detail}</td>
                        <td className="nowrap">{new Date(event.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!events.length && <p className="empty-state">No activity recorded yet.</p>}
            </section>
          )}
          <footer className="page-footer">
            <span>CampusKit · Campus equipment services</span>
            <span>Made for your next big idea.</span>
          </footer>
        </main>
      </div>
      {requestItem && (
        <Modal title="Request equipment" close={() => setRequestItem(null)}>
          <p className="modal-subtitle">
            {requestItem.name} · {requestItem.asset_tag}
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              if (
                await mutate(
                  '/loans',
                  'POST',
                  {
                    equipment_id: requestItem.id,
                    purpose: data.get('purpose'),
                    due_date: data.get('due_date'),
                  },
                  'Request submitted. A staff member will review it.',
                )
              ) {
                setRequestItem(null);
                setView('loans');
              }
            }}
          >
            <label>
              What will you use it for?
              <textarea
                name="purpose"
                minLength={10}
                maxLength={500}
                required
                rows={4}
                placeholder="Tell us a little about your class or project…"
              />
            </label>
            <label>
              Return date
              <input
                name="due_date"
                type="date"
                min={today}
                max={new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)}
                defaultValue={new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)}
                required
              />
            </label>
            <p className="muted small">
              A request does not reserve equipment until staff approval. Pickup is confirmed by
              staff.
            </p>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="modal-buttons">
              <button type="button" className="secondary" onClick={() => setRequestItem(null)}>
                Cancel
              </button>
              <button className="primary" disabled={busy}>
                {busy ? 'Submitting…' : 'Submit request'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {adding && (
        <Modal title="Add equipment" close={() => setAdding(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const data = Object.fromEntries(new FormData(e.currentTarget));
              if (await mutate('/equipment', 'POST', data, 'Equipment added to the catalog.'))
                setAdding(false);
            }}
          >
            <label>
              Equipment name
              <input name="name" minLength={3} maxLength={100} required />
            </label>
            <div className="form-grid">
              <label>
                Category
                <select name="category">
                  {['Laptops', 'Cameras', 'Audio', 'Accessories'].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Asset tag
                <input name="asset_tag" pattern="[A-Z0-9-]{3,30}" required placeholder="LAP-003" />
              </label>
            </div>
            <label>
              Description
              <textarea name="description" minLength={5} maxLength={300} rows={3} required />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="modal-buttons">
              <button type="button" className="secondary" onClick={() => setAdding(false)}>
                Cancel
              </button>
              <button className="primary" disabled={busy}>
                Add equipment
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
createRoot(document.getElementById('root')!).render(<App />);
