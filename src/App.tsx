import { useEffect, useRef, useState } from 'react'
import { Dashboard, Inventory } from './StockViews'
import { TransactionDetail, TransactionPage } from './Transactions'
import { Reports } from './Reports'
import { apply, demoData, load, persist, reference, revise, submit } from './inventory'
import type { Command, Entry, Kind, Result, Role, Transaction } from './inventory'
import './App.css'

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { id: 'inventory', label: 'Inventory', icon: 'stack' },
  { id: 'stock-receive', label: 'Stock Receive', icon: 'down' },
  { id: 'stock-issue', label: 'Stock Issue', icon: 'up' },
  { id: 'stock-transfer', label: 'Stock Transfer', icon: 'swap' },
  { id: 'spoilage', label: 'Spoilage', icon: 'warning' },
  { id: 'reports', label: 'Reports', icon: 'doc' },
] as const
type Tab = typeof tabs[number]['id']
const transactionTabs: Partial<Record<Tab, Kind>> = {
  'stock-receive': 'receive', 'stock-issue': 'issue', 'stock-transfer': 'transfer', spoilage: 'spoil',
}
const kindTab: Record<Kind, Tab> = {
  receive: 'stock-receive', issue: 'stock-issue', transfer: 'stock-transfer', adjust: 'stock-transfer',
  spoil: 'spoilage', dispose: 'spoilage',
}
const profiles: Record<Role, { name: string; initials: string }> = {
  'Store Officer': { name: 'Aina Rahman', initials: 'AR' }, Supervisor: { name: 'Daniel Tan', initials: 'DT' },
}
function readRoute() {
  const [name, id] = window.location.hash.slice(1).split('/')
  return { tab: tabs.find(tab => tab.id === name)?.id ?? 'dashboard', id: /^\d+$/.test(id ?? '') ? Number(id) : undefined }
}

export default function App() {
  const [data, setData] = useState(load)
  const [role, setRole] = useState<Role>('Store Officer')
  const [tab, setTab] = useState(() => readRoute().tab)
  const [selected, setSelected] = useState<number | undefined>(() => readRoute().id)
  const [message, setMessage] = useState('')
  const profileMenu = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    const onHash = () => {
      const route = readRoute()
      setTab(route.tab)
      setSelected(route.id)
      setMessage('')
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  useEffect(() => persist(data), [data])

  const profile = profiles[role]
  const screen = tabs.find(item => item.id === tab)!
  const kind = transactionTabs[tab]
  const selectedTransaction = data.find(t => t.id === selected)
  function commit(result: Result, note: string, open = false) {
    if (!result.ok) return result.error
    setData(result.data)
    setMessage(note)
    if (open) setSelected(result.id)
    return undefined
  }
  function create(entry: Entry) {
    const result = submit(data, role, entry)
    return commit(result, result.ok ? reference(result.data[result.data.length - 1]) + ' submitted for review.' : '', true)
  }
  function action(id: number, command: Command, note: string, quantity: number) {
    const result = apply(data, role, id, command, note, quantity)
    const updated = result.ok ? result.data.find(t => t.id === id) : undefined
    return commit(result, updated ? reference(updated) + ' · ' + updated.events.at(-1)?.action + '.' : '')
  }
  function correction(id: number, entry: Entry, note: string) {
    return commit(revise(data, role, id, entry, note), 'Correction submitted for review.')
  }
  function switchProfile(next: Role) {
    setRole(next)
    setMessage('')
    setSelected(undefined)
    if (profileMenu.current) profileMenu.current.open = false
  }
  function reset() {
    if (!window.confirm('Reset the fictional transactions in this browser?')) return
    setData(demoData())
    setRole('Store Officer')
    setSelected(undefined)
    setMessage('Demo data reset.')
    if (profileMenu.current) profileMenu.current.open = false
  }
  const open = (record: Transaction) => setSelected(record.id)

  return <div className="app">
    <aside className="sidebar">
      <details className="profile" ref={profileMenu}>
        <summary aria-label={'Active profile: ' + role}>
          <span className="avatar" aria-hidden="true">{profile.initials}</span>
          <span className="profile-name"><strong>{profile.name}</strong><small>{role}</small></span>
          <span className="chevron" aria-hidden="true">⌄</span>
        </summary>
        <div className="profile-options">
          {(Object.keys(profiles) as Role[]).map(option => <button type="button" key={option}
            aria-pressed={option === role} onClick={() => switchProfile(option)}>{option}</button>)}
          <button type="button" className="reset" onClick={reset}>Reset demo data</button>
        </div>
      </details>
      <nav aria-label="Main navigation">
        {tabs.map(item => {
          const count = data.filter(t => t.status === 'Pending review' && kindTab[t.kind] === item.id).length
          return <a key={item.id} href={'#' + item.id} aria-current={tab === item.id ? 'page' : undefined}>
            <span className={'nav-icon ' + item.icon} aria-hidden="true" />{item.label}
            {count > 0 && role === 'Supervisor' && <span className="nav-count" aria-label={count + ' pending'}>{count}</span>}
          </a>
        })}
      </nav>
      <div className="sidebar-footer">Fish Inventory<span>Fictional demo records</span></div>
    </aside>
    <main>
      <div className="topbar"><span>Fish Inventory <span className="crumb">/ {screen.label}</span></span><span className="demo-tag"><i />Prototype</span></div>
      <div className="content">
        <div className="notice no-print" role="status">{message}</div>
        {tab === 'dashboard' && <Dashboard data={data} onOpen={open} />}
        {tab === 'inventory' && <Inventory data={data} onOpen={open} />}
        {kind && <TransactionPage key={tab} initialKind={kind} role={role} data={data} onOpen={open} onCreate={create} />}
        {tab === 'reports' && <Reports data={data} onOpen={open} />}
      </div>
    </main>
    {selectedTransaction && <TransactionDetail key={selectedTransaction.id} t={selectedTransaction} data={data}
      role={role} workflowHref={tab !== kindTab[selectedTransaction.kind] ?
        '#' + kindTab[selectedTransaction.kind] + '/' + selectedTransaction.id : undefined}
      onClose={() => setSelected(undefined)} onCommand={action} onRevise={correction} />}
  </div>
}
