'use client'

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'

import { ApiError, getCurrentUser, getDashboardData, login, logout, roleLabels, type DashboardData, type Role, type User } from './api'

type Page = 'Dashboard' | 'Exhibitions' | 'Animals' | 'Live calls' | 'Statistics' | 'Reports' | 'Imports'

const navigation: { label: Page; symbol: string }[] = [
  { label: 'Dashboard', symbol: '⌂' },
  { label: 'Exhibitions', symbol: 'E' },
  { label: 'Animals', symbol: 'A' },
  { label: 'Live calls', symbol: 'L' },
  { label: 'Statistics', symbol: 'S' },
  { label: 'Reports', symbol: 'R' },
  { label: 'Imports', symbol: 'I' },
]

const rolePages: Record<Role, Page[]> = {
  admin: ['Dashboard', 'Exhibitions', 'Animals', 'Live calls', 'Statistics', 'Reports', 'Imports'],
  club: ['Dashboard', 'Exhibitions', 'Animals', 'Statistics', 'Reports', 'Imports'],
  editor: ['Dashboard', 'Exhibitions', 'Animals', 'Statistics', 'Reports', 'Imports'],
  viewer: ['Dashboard', 'Exhibitions', 'Statistics', 'Reports'],
  judge: ['Dashboard', 'Animals', 'Statistics'],
  steward: ['Dashboard', 'Live calls', 'Animals'],
  'chief-steward': ['Dashboard', 'Live calls', 'Animals', 'Statistics', 'Reports'],
  exhibitor: ['Dashboard', 'Exhibitions', 'Animals'],
}

const pageCopy: Record<Page, { title: string; description: string }> = {
  Dashboard: { title: 'Dashboard', description: 'Aktuálny prehľad výstavy a posudzovania.' },
  Exhibitions: { title: 'Výstavy', description: 'Správa pripravovaných a prebiehajúcich výstav.' },
  Animals: { title: 'Zvieratá', description: 'Prihlásené zvieratá, triedy a aktuálny stav.' },
  'Live calls': { title: 'Živé vyvolávanie', description: 'Fronty a vyvolávanie zvierat ku kruhom.' },
  Statistics: { title: 'Štatistiky', description: 'Výkon kruhov a priebeh výstavy.' },
  Reports: { title: 'Reporty', description: 'Oficiálne výsledky a exporty.' },
  Imports: { title: 'Import údajov', description: 'Bezpečný import registrácií do BESTCAT.' },
}

function Icon({ name }: { name: 'arrow' | 'bell' | 'menu' | 'search' | 'logout' | 'eye' }) {
  const paths: Record<typeof name, ReactNode> = {
    arrow: <><path d="M5 12h14" /><path d="m15 8 4 4-4 4" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    menu: <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>,
    search: <><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></>,
    logout: <><path d="M10 5H5v14h5" /><path d="M13 8l4 4-4 4" /><path d="M8 12h9" /></>,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></>,
  }
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function Brand() {
  return <div className="brand"><span className="brand-mark">B</span><span>BESTCAT</span></div>
}

function Login({ onAuthenticated, onPublic }: { onAuthenticated: (user: User) => void; onPublic: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [keepSignedIn, setKeepSignedIn] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [helpVisible, setHelpVisible] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const result = await login(email, password, keepSignedIn)
      onAuthenticated(result.user)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Server je momentálne nedostupný.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-screen">
      <main className="login-form-wrap">
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <span className="eyebrow">VITAJTE SPÄŤ</span>
          <h2>Prihlásenie do BESTCAT</h2>
          <p>Zadajte svoje údaje a vstúpte do pracovného priestoru výstavy.</p>

          {error && <div className="form-message error" role="alert">{error}</div>}
          {helpVisible && <div className="form-message info" role="status">O obnovenie hesla požiadajte administrátora vášho klubu.</div>}

          <label>
            <span>E-mailová adresa</span>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              autoFocus
              required
              disabled={submitting}
              placeholder="meno@klub.sk"
            />
          </label>
          <label>
            <span>Heslo</span>
            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                disabled={submitting}
                placeholder="Zadajte heslo"
              />
              <button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Skryť heslo' : 'Zobraziť heslo'}>
                <Icon name="eye" />
              </button>
            </div>
          </label>
          <div className="login-options">
            <label><input type="checkbox" checked={keepSignedIn} onChange={(event) => setKeepSignedIn(event.target.checked)} disabled={submitting} /> Zostať prihlásený</label>
            <button type="button" onClick={() => setHelpVisible((value) => !value)}>Zabudnuté heslo?</button>
          </div>
          <button className="button primary login-submit" type="submit" disabled={submitting}>
            {submitting ? <><span className="spinner" /> Prihlasujem…</> : <>Prihlásiť sa <Icon name="arrow" /></>}
          </button>
          <div className="public-login"><span>Hľadáte výsledky výstavy?</span><button type="button" onClick={onPublic}>Otvoriť živý prehľad</button></div>
        </form>
      </main>
    </div>
  )
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return <article className="metric-card"><div className="metric-top"><span>{label}</span><span>•••</span></div><strong>{value}</strong><div className="metric-note"><b>↗</b> {note}</div></article>
}

function DashboardContent({ user }: { user: User }) {
  const firstName = user.name.split(' ')[0]
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    let active = true
    getDashboardData().then((result) => { if (active) setData(result) }).catch(() => undefined)
    return () => { active = false }
  }, [])

  const completion = data?.entries ? Math.round((data.completedEntries / data.entries) * 100) : 0
  const date = data?.exhibition
    ? new Intl.DateTimeFormat('sk-SK', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(data.exhibition.startDate))
    : 'načítavam'

  return (
    <>
      <div className="page-header"><div><h1>Dobré ráno, {firstName}</h1><p>{data?.exhibition ? `${data.exhibition.title} · ${data.exhibition.city} · ${date}` : 'Načítavam údaje výstavy…'}</p></div><button className="button secondary">Exportovať report</button><button className="button primary">Nová výstava</button></div>
      <section className="metrics">
        <Metric label="Zvieratá spolu" value={data ? String(data.cats) : '—'} note="uložené v Payload CMS" />
        <Metric label="Katalógové prihlášky" value={data ? String(data.entries) : '—'} note="importované zo vstupného CSV" />
        <Metric label="Dokončené" value={data ? String(data.completedEntries) : '—'} note={`${completion} % prihlášok`} />
        <Metric label="Zdrojové importy" value={data ? String(data.imports) : '—'} note="PDF katalóg a CSV dáta" />
      </section>
      <section className="dashboard-grid">
        <article className="panel live-overview">
          <div className="panel-heading"><div><h2>Živý prehľad posudzovania</h2><p>Priebeh vo všetkých kruhoch v reálnom čase</p></div><button className="text-button">Zobraziť vyvolávanie <Icon name="arrow" /></button></div>
          <div className="ring-list">
            {[
              ['Kruh 1', 'Dr. Amelia Hart', 'Dlhosrsté · Trieda 11', '26 / 34', 78],
              ['Kruh 2', 'Michael Chen', 'Krátkosrsté · Trieda 9', '18 / 29', 62],
              ['Kruh 3', 'Sofia Lindberg', 'Polodlhosrsté · Trieda 7', '31 / 34', 91],
              ['Kruh 4', 'James Wilson', 'Best in Show', '0 / 18', 4],
            ].map(([ring, judge, category, count, progress]) => (
              <div className="ring-row" key={String(ring)}><div><span className="ring-badge">{String(ring).replace('Kruh ', 'K')}</span><span><b>{ring}</b><small>{judge}</small></span></div><span className="ring-category">{category}</span><div className="progress"><span style={{ width: `${progress}%` }} /></div><b>{count}</b><span className="status"><i /> Prebieha</span></div>
            ))}
          </div>
        </article>
        <article className="panel activity-panel"><div className="panel-heading"><div><h2>Posledná aktivita</h2><p>Živé aktualizácie výstavy</p></div></div>{['#048 je na ceste ku kruhu 2', '#052 bolo vyvolané ku kruhu 1', '#038 získalo EX1 · CAC'].map((text, index) => <div className="activity" key={text}><span className={`activity-no tone-${index}`}>{['048', '052', '038'][index]}</span><div><b>{text}</b><p>{['Prijaté vystavovateľom', 'Silver Lining · Ragdoll', 'Arctic Whisper · Maine Coon'][index]}</p></div><time>{index ? `${index * 4} min` : 'teraz'}</time></div>)}</article>
      </section>
    </>
  )
}

function PageContent({ page }: { page: Exclude<Page, 'Dashboard'> }) {
  const copy = pageCopy[page]
  return <><div className="page-header"><div><span className="eyebrow">BESTCAT</span><h1>{copy.title}</h1><p>{copy.description}</p></div></div><article className="panel empty-state"><span className="empty-mark">{navigation.find((item) => item.label === page)?.symbol}</span><h2>{copy.title}</h2><p>Modul je pripravený na napojenie ďalších dát a workflow.</p></article></>
}

function Workspace({ user, onSignOut }: { user: User; onSignOut: () => Promise<void> }) {
  const [page, setPage] = useState<Page>('Dashboard')
  const [mobileNav, setMobileNav] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const initials = user.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const allowedPages = useMemo(() => rolePages[user.role], [user.role])

  async function handleSignOut() {
    setSigningOut(true)
    await onSignOut()
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
        <Brand />
        <div className="workspace"><span className="workspace-logo">BC</span><div><small>PRACOVNÝ PRIESTOR</small><b>BESTCAT Club</b></div></div>
        <nav aria-label="Hlavná navigácia">
          <small>SPRÁVA</small>
          {navigation.filter((item) => allowedPages.includes(item.label)).map((item) => <button key={item.label} className={page === item.label ? 'active' : ''} onClick={() => { setPage(item.label); setMobileNav(false) }}><span>{item.symbol}</span>{pageCopy[item.label].title}{item.label === 'Live calls' && <i>3</i>}</button>)}
        </nav>
        <div className="sidebar-footer">
          <div className="user-mini"><span>{initials}</span><div><b>{user.name}</b><small>{roleLabels[user.role]}</small></div><button className="signout-button" onClick={handleSignOut} disabled={signingOut} title="Odhlásiť sa" aria-label="Odhlásiť sa"><Icon name="logout" /></button></div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar"><button className="menu-button" onClick={() => setMobileNav((value) => !value)} aria-label="Otvoriť menu"><Icon name="menu" /></button><div className="breadcrumbs"><span>BESTCAT Club</span><b>/</b><strong>{pageCopy[page].title}</strong></div><div className="top-actions"><Link className="role-pill" href="/admin">CMS</Link><span className="role-pill">{roleLabels[user.role]}</span><button className="icon-button" aria-label="Hľadať"><Icon name="search" /></button><button className="icon-button notification-button" aria-label="Notifikácie"><Icon name="bell" /><i /></button></div></header>
        <main className="content">{page === 'Dashboard' ? <DashboardContent user={user} /> : <PageContent page={page} />}</main>
      </div>
      {mobileNav && <button className="scrim" onClick={() => setMobileNav(false)} aria-label="Zavrieť menu" />}
    </div>
  )
}

function PublicDisplay({ onClose }: { onClose: () => void }) {
  return <div className="public-screen"><header><Brand /><div><b>Jubilee Show 2024</b><span>28.–29. december · Hrnčiarovce nad Parnou</span></div><button className="button ghost" onClick={onClose}>Späť na prihlásenie</button></header><main><div className="public-kicker"><span className="pulse" /> KATALÓG JE NAČÍTANÝ</div><div className="public-number">121</div><h1>Výstavných prihlášok</h1><p>Terra Felis Slovakia · L#244205</p><div className="public-ring">BESTCAT CMS <span>Živé vyvolávanie sa aktivuje pri otvorení kruhov</span></div></main><footer><span>5 skupín plemien</span><span>22 plemien</span><span>121 mačiek</span></footer></div>
}

function LoadingScreen() {
  return <div className="loading-screen"><Brand /><span className="spinner dark" /><span>Načítavam pracovný priestor…</span></div>
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [publicMode, setPublicMode] = useState(false)

  useEffect(() => {
    let active = true
    getCurrentUser().then(({ user: currentUser }) => { if (active) setUser(currentUser) }).catch(() => undefined).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  async function handleSignOut() {
    await logout().catch(() => undefined)
    setUser(null)
  }

  if (loading) return <LoadingScreen />
  if (publicMode) return <PublicDisplay onClose={() => setPublicMode(false)} />
  if (!user) return <Login onAuthenticated={setUser} onPublic={() => setPublicMode(true)} />
  return <Workspace user={user} onSignOut={handleSignOut} />
}
