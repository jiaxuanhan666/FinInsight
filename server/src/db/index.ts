import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', '..', 'data')
const DB_PATH = path.join(DATA_DIR, 'fininsight.json')

interface DBData {
  users: Record<string, any>
  transactions: Record<string, any>
  persistentTags: Record<string, any>
  assets: Record<string, any>
  liabilities: Record<string, any>
  savingsGoals: Record<string, any>
  aiReports: Record<string, any>
  analyticsEvents: any[]
  exchangeRates: Record<string, any>
}

let db: DBData = {
  users: {},
  transactions: {},
  persistentTags: {},
  assets: {},
  liabilities: {},
  savingsGoals: {},
  aiReports: {},
  analyticsEvents: [],
  exchangeRates: {},
}

// Initialize
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}
if (fs.existsSync(DB_PATH)) {
  try {
    const loaded = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
    db = { ...db, ...loaded }
  } catch {
    console.warn('DB file corrupted, starting fresh')
  }
}

function save() {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8')
}

let timer: ReturnType<typeof setTimeout> | null = null
function scheduleSave() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(save, 300)
}

// ===== Collection Helpers =====

function table(name: keyof DBData) {
  return {
    all: (): any[] => Object.values(db[name]),
    get: (id: string): any => (db[name] as any)[id] || null,
    find: (fn: (row: any) => boolean): any | null =>
      Object.values(db[name]).find(fn) || null,
    filter: (fn: (row: any) => boolean): any[] =>
      Object.values(db[name]).filter(fn),
    insert: (record: any) => {
      if (record.id && name !== 'analyticsEvents') {
        (db[name] as any)[record.id] = record
      } else if (name === 'analyticsEvents') {
        db.analyticsEvents.push(record)
      } else if (name === 'exchangeRates') {
        (db[name] as any)[record.pair] = record
      }
      scheduleSave()
    },
    update: (id: string, updates: any) => {
      if ((db[name] as any)[id]) {
        (db[name] as any)[id] = { ...(db[name] as any)[id], ...updates }
        scheduleSave()
      }
    },
    delete: (id: string) => {
      delete (db[name] as any)[id]
      scheduleSave()
    },
    count: (fn?: (row: any) => boolean): number => {
      if (fn) return Object.values(db[name]).filter(fn).length
      return Object.values(db[name]).length
    },
    sum: (field: string, fn?: (row: any) => boolean): number => {
      const rows = fn ? Object.values(db[name]).filter(fn) : Object.values(db[name])
      return rows.reduce((s: number, r: any) => s + (Number(r[field]) || 0), 0)
    },
    distinctUsers: (field: string, fn?: (row: any) => boolean): number => {
      const rows = fn ? db.analyticsEvents.filter(fn) : db.analyticsEvents
      return new Set(rows.map((r: any) => r.userUuid)).size
    },
  }
}

export { db, table, scheduleSave, save as flushSave }
