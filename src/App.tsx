import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  batch, demoReceipts, kg, loadReceipts, persistReceipts, reference,
  reviewReceipt, sites, species, submitReceipt,
} from './inventory'
import type { Decision, Receipt, ReceiptFields, Role, Site, Species, Status } from './inventory'
import './App.css'

const navigation = [
  { path: 'inventory', label: 'Inventory' },
  { path: 'receipts', label: 'Receipts' },
  { path: 'approvals', label: 'Approvals' },
  { path: 'history', label: 'Batch history' },
] as const
type Section = typeof navigation[number]['path']
type View = Section | 'new' | 'receipt' | 'edit'

function getRoute(): { view: View; id?: number } {
  const [view, id] = window.location.hash.slice(1).split('/')
  if (view === 'new') return { view }
  if ((view === 'receipt' || view === 'edit') && /^\d+$/.test(id ?? '')) return { view, id: Number(id) }
  return { view: navigation.find(item => item.path === view)?.path ?? 'inventory' }
}
const go = (path: string) => { window.location.hash = path }
const sectionFor = (view: View): Section => ['new', 'receipt', 'edit'].includes(view) ? 'receipts' : view as Section
const timestamp = (date: string) =>
  new Intl.DateTimeFormat('en-MY', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date))

function Badge({ status }: { status: Status }) {
  return <span className={'badge ' + status.toLowerCase().split(' ')[0]}>{status}</span>
}

function ReceiptTable({ receipts, empty }: { receipts: Receipt[]; empty: string }) {
  if (!receipts.length) return <div className="empty">{empty}</div>
  return <div className="table-scroll"><table>
    <thead><tr><th scope="col">Receipt / batch</th><th scope="col">Species</th><th scope="col">Location</th><th scope="col">Quantity</th><th scope="col">Status</th></tr></thead>
    <tbody>{[...receipts].reverse().map(receipt => <tr key={receipt.id}>
      <td><a href={'#receipt/' + receipt.id}>{reference(receipt.id)}</a><small>{batch(receipt.id)}</small></td>
      <td>{receipt.species}</td><td>{receipt.site}</td><td>{kg(receipt.grams)}</td>
      <td><Badge status={receipt.status} /></td>
    </tr>)}</tbody>
  </table></div>
}

function ReceiptForm({ receipt, onSubmit }: { receipt?: Receipt; onSubmit: (fields: ReceiptFields) => void }) {
  const [error, setError] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const quantity = String(fields.get('quantity')).trim()
    const grams = Math.round(Number(quantity) * 1000)
    const source = String(fields.get('source')).trim()
    if (!/^\d+(\.\d{1,3})?$/.test(quantity) || grams <= 0 || !Number.isSafeInteger(grams)) {
      setError('Enter a positive quantity in kilograms with up to three decimal places.')
      return
    }
    if (!source) { setError('Enter a source or supplier.'); return }
    onSubmit({ species: fields.get('species') as Species, site: fields.get('site') as Site, source, grams })
  }
  return <form className="panel form" onSubmit={submit}>
    <div className="form-grid">
      <label>Fish species<select name="species" defaultValue={receipt?.species ?? species[0]}>{species.map(name => <option key={name}>{name}</option>)}</select></label>
      <label>Storage location<select name="site" defaultValue={receipt?.site ?? sites[0]}>{sites.map(site => <option key={site}>{site}</option>)}</select></label>
      <label>Quantity (kg)<input name="quantity" inputMode="decimal" required defaultValue={receipt ? receipt.grams / 1000 : undefined} placeholder="100" /></label>
      <label>Source or supplier<input name="source" required maxLength={100} defaultValue={receipt?.source} placeholder="Demo Supplier" /></label>
    </div>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="actions"><button type="submit">{receipt ? 'Resubmit for approval' : 'Submit for approval'}</button><a href={receipt ? '#receipt/' + receipt.id : '#receipts'} className="button secondary">Cancel</a></div>
  </form>
}

function Review({ onReview }: { onReview: (decision: Decision, reason: string) => void }) {
  const [decision, setDecision] = useState<Decision>('approve')
  const [error, setError] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const reason = String(new FormData(event.currentTarget).get('reason')).trim()
    if (decision !== 'approve' && !reason) { setError('Enter a reason for this decision.'); return }
    onReview(decision, reason)
  }
  return <form className="panel form" onSubmit={submit}>
    <h2>Review receipt</h2>
    <div className="form-grid">
      <label>Decision<select value={decision} onChange={event => { setDecision(event.target.value as Decision); setError('') }}><option value="approve">Approve and post</option><option value="return">Return for correction</option><option value="reject">Reject</option></select></label>
      <label>{decision === 'approve' ? 'Note (optional)' : 'Reason'}<input name="reason" maxLength={200} required={decision !== 'approve'} /></label>
    </div>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="actions"><button type="submit">{decision === 'approve' ? 'Approve and post' : decision === 'return' ? 'Return receipt' : 'Reject receipt'}</button></div>
  </form>
}

function Activity({ receipts, empty }: { receipts: Receipt[]; empty: string }) {
  const entries = receipts.flatMap(receipt => receipt.events.map((event, index) => ({ event, index, receipt })))
    .sort((a, b) => b.event.time.localeCompare(a.event.time) || b.index - a.index)
  if (!entries.length) return <div className="empty">{empty}</div>
  return <ul className="activity">{entries.map(({ event, index, receipt }) => <li key={receipt.id + '-' + index}>
    <div><a href={'#receipt/' + receipt.id}>{reference(receipt.id)}</a><span className="activity-action">{event.action}</span>
      {event.note && <p>{event.note}</p>}</div>
    <small>{event.role} · {timestamp(event.time)}</small>
  </li>)}</ul>
}

export default function App() {
  const [receipts, setReceipts] = useState(loadReceipts)
  const [role, setRole] = useState<Role>('Store Officer')
  const [route, setRoute] = useState(getRoute)
  const [siteFilter, setSiteFilter] = useState<Site | 'All locations'>('All locations')
  const [feedback, setFeedback] = useState('')
  useEffect(() => {
    const onRoute = () => setRoute(getRoute())
    window.addEventListener('hashchange', onRoute)
    return () => window.removeEventListener('hashchange', onRoute)
  }, [])
  useEffect(() => persistReceipts(receipts), [receipts])

  const storeOfficer = role === 'Store Officer'
  const posted = receipts.filter(receipt => receipt.status === 'Posted')
  const pending = receipts.filter(receipt => receipt.status === 'Pending approval')
  const selected = receipts.find(receipt => receipt.id === route.id)
  const filtered = siteFilter === 'All locations' ? posted : posted.filter(receipt => receipt.site === siteFilter)

  function save(fields: ReceiptFields) {
    const result = submitReceipt(receipts, role, fields, route.view === 'edit' ? selected?.id : undefined)
    if (result === receipts) return
    setReceipts(result)
    const id = route.view === 'edit' ? selected?.id : result[result.length - 1].id
    setFeedback('Receipt sent for supervisor review. Stock is unchanged.')
    go('receipt/' + id)
  }

  function decide(id: number, decision: Decision, reason: string) {
    setReceipts(current => reviewReceipt(current, id, role, decision, reason))
    setFeedback(decision === 'approve' ? 'Receipt posted. Inventory and batch history are updated.' : 'Decision recorded. Stock is unchanged.')
  }

  function reset() {
    if (!window.confirm('Restore the sample receipt and clear demo changes in this browser?')) return
    setReceipts(demoReceipts())
    setRole('Store Officer')
    setSiteFilter('All locations')
    setFeedback('Demo data restored.')
    go('inventory')
  }

  return <div className="app">
    <aside className="sidebar">
      <a href="#inventory" className="brand"><span className="mark" aria-hidden="true">FI</span><span>Fish Inventory<small>Prototype</small></span></a>
      <nav aria-label="Main navigation">{navigation.map(item => <a key={item.path} href={'#' + item.path} aria-current={sectionFor(route.view) === item.path ? 'page' : undefined}>
        {item.label}{item.path === 'approvals' && pending.length > 0 && <span className="nav-count">{pending.length}</span>}
      </a>)}</nav>
      <div className="sidebar-end"><span>Fictional sample data</span><button type="button" onClick={reset}>Reset demo</button></div>
    </aside>
    <main>
      <div className="topbar"><span>Stock receiving workspace</span><label>Demo role<select value={role} onChange={event => { setRole(event.target.value as Role); setFeedback('') }}><option>Store Officer</option><option>Supervisor</option></select></label></div>
      <div className="content">
        <div className="feedback" role="status">{feedback}</div>
        {route.view === 'inventory' && <>
          <header><div><h1>Inventory</h1><p>Posted stock by batch and storage location.</p></div>{storeOfficer && <a className="button" href="#new">New receipt</a>}</header>
          <div className="stats">
            <div><span>On hand</span><strong>{kg(posted.reduce((total, receipt) => total + receipt.grams, 0))}</strong><small>Across both locations</small></div>
            <div><span>Posted batches</span><strong>{posted.length}</strong><small>Approved receipts</small></div>
            <div><span>Pending review</span><strong>{pending.length}</strong><a href="#approvals">Open approval queue →</a></div>
          </div>
          <section className="panel"><div className="panel-heading"><h2>Stock by batch</h2><label className="filter">Location<select value={siteFilter} onChange={event => setSiteFilter(event.target.value as typeof siteFilter)}><option>All locations</option>{sites.map(site => <option key={site}>{site}</option>)}</select></label></div>
            <ReceiptTable receipts={filtered} empty="No posted stock at the selected locations. Approved receipts appear here." />
          </section>
        </>}
        {route.view === 'receipts' && <>
          <header><div><h1>Receipts</h1><p>Track receiving records and their approval status.</p></div>{storeOfficer && <a className="button" href="#new">New receipt</a>}</header>
          <section className="panel"><ReceiptTable receipts={receipts} empty="No receipts yet." /></section>
        </>}
        {route.view === 'approvals' && <>
          <header><div><h1>Approval queue</h1><p>{storeOfficer ? 'Switch to Supervisor to make a review decision.' : 'Review incoming receipts before stock is posted.'}</p></div></header>
          <section className="panel"><ReceiptTable receipts={pending} empty="No receipts awaiting approval." /></section>
        </>}
        {route.view === 'history' && <>
          <header><div><h1>Batch history</h1><p>Review submissions, decisions, and posted movements.</p></div></header>
          <section className="panel"><Activity receipts={receipts} empty="No activity yet." /></section>
        </>}
        {(route.view === 'new' || route.view === 'edit') && <>
          <a className="back" href={selected ? '#receipt/' + selected.id : '#receipts'}>← Back to receipts</a>
          <header><div><h1>{route.view === 'edit' ? 'Correct receipt' : 'New receipt'}</h1><p>Record stock for a separate supervisor to review.</p></div></header>
          {storeOfficer && (route.view === 'new' || selected?.status === 'Returned') ?
            <ReceiptForm key={selected?.id ?? 'new'} receipt={selected} onSubmit={save} /> :
            <div className="panel empty">Only a Store Officer can create a receipt or correct a returned receipt.</div>}
        </>}
        {route.view === 'receipt' && <>
          <a className="back" href="#receipts">← Back to receipts</a>
          {selected ? <>
            <header><div><h1>{reference(selected.id)}</h1><p>{batch(selected.id)} · {selected.species}</p></div><Badge status={selected.status} /></header>
            <section className="panel"><dl className="receipt-meta"><div><dt>Quantity</dt><dd>{kg(selected.grams)}</dd></div><div><dt>Storage location</dt><dd>{selected.site}</dd></div><div><dt>Source</dt><dd>{selected.source}</dd></div></dl></section>
            {!storeOfficer && selected.status === 'Pending approval' && <Review key={selected.id} onReview={(decision, reason) => decide(selected.id, decision, reason)} />}
            {storeOfficer && selected.status === 'Returned' && <div className="actions"><a className="button" href={'#edit/' + selected.id}>Correct receipt</a></div>}
            <section className="panel"><div className="panel-heading"><h2>Receipt history</h2></div><Activity receipts={[selected]} empty="No activity yet." /></section>
          </> : <div className="panel empty">This receipt is unavailable in the current demo data.</div>}
        </>}
      </div>
    </main>
  </div>
}
