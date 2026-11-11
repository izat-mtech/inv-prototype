export const sites = ['Site A', 'Site B'] as const
export const species = ['Asian seabass', 'Red snapper', 'Tilapia', 'Mackerel'] as const
export type Site = typeof sites[number]
export type Species = typeof species[number]
export type Role = 'Store Officer' | 'Supervisor'
export type Status = 'Pending approval' | 'Returned' | 'Rejected' | 'Posted'
export type ReceiptEvent = {
  action: 'Submitted' | 'Resubmitted' | 'Returned for correction' | 'Rejected' | 'Approved and posted'
  role: Role
  time: string
  note?: string
}
export type ReceiptFields = {
  site: Site
  species: Species
  source: string
  grams: number
}
export type Receipt = ReceiptFields & {
  id: number
  status: Status
  events: ReceiptEvent[]
}

const storageKey = 'fish-inventory-demo-v1'
export const reference = (id: number) => 'REC-' + String(id).padStart(4, '0')
export const batch = (id: number) => 'LOT-' + String(id).padStart(4, '0')
export const kg = (grams: number) =>
  new Intl.NumberFormat('en-MY', { maximumFractionDigits: 3 }).format(grams / 1000) + ' kg'

export function demoReceipts(): Receipt[] {
  return [{
    id: 1, site: 'Site A', species: 'Asian seabass', source: 'Demo Supplier',
    grams: 100_000, status: 'Pending approval',
    events: [{ action: 'Submitted', role: 'Store Officer', time: new Date().toISOString() }],
  }]
}

export function loadReceipts(): Receipt[] {
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      const decoded: unknown = JSON.parse(stored)
      if (Array.isArray(decoded) && decoded.every(item => item && Array.isArray(item.events))) return decoded
    }
  } catch {
    // The demo can still run in memory when storage is disabled.
  }
  return demoReceipts()
}

export function persistReceipts(receipts: Receipt[]) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(receipts))
  } catch {
    // Keep the current session usable in browsers that disallow local storage.
  }
}

export function submitReceipt(receipts: Receipt[], role: Role, fields: ReceiptFields, id?: number): Receipt[] {
  if (role !== 'Store Officer' || !fields.source.trim() ||
      !Number.isSafeInteger(fields.grams) || fields.grams <= 0 ||
      !sites.includes(fields.site) || !species.includes(fields.species)) return receipts

  if (id === undefined) {
    const nextId = receipts.reduce((largest, receipt) => Math.max(largest, receipt.id), 0) + 1
    const event: ReceiptEvent = { action: 'Submitted', role, time: new Date().toISOString() }
    return [...receipts, { ...fields, id: nextId, status: 'Pending approval', events: [event] }]
  }

  return receipts.map(receipt => {
    if (receipt.id !== id || receipt.status !== 'Returned') return receipt
    const event: ReceiptEvent = { action: 'Resubmitted', role, time: new Date().toISOString() }
    return { ...receipt, ...fields, status: 'Pending approval', events: [...receipt.events, event] }
  })
}

const outcomes = {
  approve: { action: 'Approved and posted', status: 'Posted' },
  return: { action: 'Returned for correction', status: 'Returned' },
  reject: { action: 'Rejected', status: 'Rejected' },
} as const
export type Decision = keyof typeof outcomes

export function reviewReceipt(receipts: Receipt[], id: number, role: Role, decision: Decision, reason: string): Receipt[] {
  if (role !== 'Supervisor' || (decision !== 'approve' && !reason.trim())) return receipts

  return receipts.map(receipt => {
    if (receipt.id !== id || receipt.status !== 'Pending approval') return receipt
    const { action, status } = outcomes[decision]
    const event: ReceiptEvent = { action, role, time: new Date().toISOString(), note: reason.trim() || undefined }
    return { ...receipt, status, events: [...receipt.events, event] }
  })
}
