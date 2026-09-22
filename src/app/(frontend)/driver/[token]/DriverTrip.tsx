'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Droplets,
  MapPin,
  MessageCircle,
  Minus,
  Phone,
  Plus,
  Search,
  SkipForward,
  Truck,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { completeTrip, saveStop } from '../actions'
import type { DriverTripData, Stop, StopStatus } from '../types'

const rupee = new Intl.NumberFormat('en-PK', {
  style: 'currency',
  currency: 'PKR',
  minimumFractionDigits: 0,
})

type Filter = 'pending' | 'done' | 'all'

const PRIORITY_STYLES: Record<NonNullable<Stop['priority']>, string> = {
  URGENT: 'bg-red-100 text-red-700 ring-red-200',
  HIGH: 'bg-orange-100 text-orange-700 ring-orange-200',
  MEDIUM: 'bg-amber-100 text-amber-700 ring-amber-200',
  LOW: 'bg-slate-100 text-slate-600 ring-slate-200',
}

export function DriverTrip({ initial }: { initial: DriverTripData }) {
  const [trip, setTrip] = useState(initial)
  const [filter, setFilter] = useState<Filter>('pending')
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [banner, setBanner] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [finishing, startFinishing] = useTransition()

  const isLocked = trip.status === 'complete'

  const totals = useMemo(() => {
    const done = trip.stops.filter((s) => s.status !== 'pending').length
    const delivered = trip.stops.filter((s) => s.status === 'delivered').length
    const given = trip.stops.reduce((n, s) => n + s.bottleGiven, 0)
    const taken = trip.stops.reduce((n, s) => n + s.bottleTaken, 0)
    const cash = trip.stops.reduce((n, s) => n + s.cashCollected, 0)
    return { done, delivered, given, taken, cash, total: trip.stops.length }
  }, [trip.stops])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return trip.stops.filter((s) => {
      if (filter === 'pending' && s.status !== 'pending') return false
      if (filter === 'done' && s.status === 'pending') return false
      if (!q) return true
      return [s.name, s.address, s.block, s.phone ?? ''].some((v) => v.toLowerCase().includes(q))
    })
  }, [trip.stops, filter, query])

  const grouped = useMemo(() => {
    const map = new Map<string, Stop[]>()
    for (const stop of visible) {
      const key = stop.block || stop.area || 'Other'
      map.set(key, [...(map.get(key) ?? []), stop])
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [visible])

  const applyStop = (id: string, patch: Partial<Stop>) => {
    setTrip((t) => ({ ...t, stops: t.stops.map((s) => (s.id === id ? { ...s, ...patch } : s)) }))
  }

  const flash = (kind: 'ok' | 'error', text: string) => {
    setBanner({ kind, text })
    setTimeout(() => setBanner(null), kind === 'ok' ? 2500 : 6000)
  }

  const onFinish = () => {
    if (!window.confirm(`Finish this trip? ${totals.total - totals.done} stop(s) are still pending.`)) return
    startFinishing(async () => {
      const res = await completeTrip(trip.token)
      if (res.ok) {
        setTrip((t) => ({ ...t, status: 'complete' }))
        flash('ok', 'Trip completed. Great work!')
      } else flash('error', res.error)
    })
  }

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-sky-700 text-white shadow-md">
        <div className="mx-auto max-w-2xl px-4 pt-4 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sky-100 text-xs font-medium uppercase tracking-wide">
                <Droplets className="h-4 w-4" /> {trip.companyName} · Driver App
              </div>
              <h1 className="mt-1 truncate text-xl font-semibold">{trip.tripAt}</h1>
              <p className="truncate text-sm text-sky-100">
                {trip.from} → {trip.areas.join(', ') || 'All areas'}
              </p>
              {trip.employees.length > 0 && (
                <p className="truncate text-xs text-sky-200">Driver: {trip.employees.join(', ')}</p>
              )}
            </div>
            <div className="shrink-0 rounded-xl bg-white/15 px-3 py-2 text-center">
              <div className="text-2xl font-bold leading-none tabular-nums">
                {totals.done}
                <span className="text-base font-medium text-sky-200">/{totals.total}</span>
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-wide text-sky-100">stops done</div>
            </div>
          </div>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all"
              style={{ width: `${totals.total ? (totals.done / totals.total) * 100 : 0}%` }}
            />
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            <Stat label="Loaded" value={String(trip.bottlesLoaded)} />
            <Stat label="Given" value={String(totals.given)} />
            <Stat label="Taken" value={String(totals.taken)} />
            <Stat label="Cash" value={rupee.format(totals.cash)} />
          </div>
        </div>
      </header>

      {banner && (
        <div
          role="status"
          className={cn(
            'sticky top-[172px] z-10 mx-auto mt-2 max-w-2xl rounded-lg px-4 py-2 text-sm font-medium shadow',
            banner.kind === 'ok' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white',
          )}
        >
          {banner.text}
        </div>
      )}

      <main className="mx-auto max-w-2xl px-4 pb-32 pt-4">
        {isLocked && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
            <div className="flex items-center gap-2 font-semibold">
              <Check className="h-5 w-5" /> This trip is complete
            </div>
            <p className="mt-1 text-sm">Stops can no longer be edited. Contact the office for changes.</p>
          </div>
        )}

        {/* Search + filters */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, address, block…"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-base shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
          />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-200/70 p-1">
          {(
            [
              ['pending', `Pending (${totals.total - totals.done})`],
              ['done', `Done (${totals.done})`],
              ['all', 'All'],
            ] as [Filter, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                'h-9 rounded-lg text-sm font-medium transition',
                filter === key ? 'bg-white text-sky-700 shadow' : 'text-slate-600',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Stops */}
        {grouped.length === 0 ? (
          <div className="mt-10 text-center text-slate-500">
            <Truck className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-2 font-medium">
              {trip.stops.length === 0 ? 'No stops on this trip yet.' : 'Nothing here.'}
            </p>
            {trip.stops.length > 0 && filter === 'pending' && (
              <p className="text-sm">All stops are done. 🎉</p>
            )}
          </div>
        ) : (
          grouped.map(([block, stops]) => (
            <section key={block} className="mt-5">
              <h2 className="sticky top-[176px] z-[5] -mx-4 bg-slate-50/95 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 backdrop-blur">
                <MapPin className="mr-1 inline h-3.5 w-3.5" />
                {block} · {stops.length}
              </h2>
              <div className="mt-1 space-y-3">
                {stops.map((stop) => (
                  <StopCard
                    key={stop.id}
                    stop={stop}
                    token={trip.token}
                    locked={isLocked}
                    open={openId === stop.id}
                    onToggle={() => setOpenId(openId === stop.id ? null : stop.id)}
                    onSaved={(patch) => {
                      applyStop(stop.id, patch)
                      setOpenId(null)
                      flash('ok', patch.status === 'skipped' ? `${stop.name} skipped` : `${stop.name} saved`)
                    }}
                    onError={(msg) => flash('error', msg)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {!isLocked && (
        <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 p-3 backdrop-blur">
          <div className="mx-auto max-w-2xl">
            <button
              type="button"
              disabled={finishing}
              onClick={onFinish}
              className="h-12 w-full rounded-xl bg-slate-900 text-base font-semibold text-white disabled:opacity-50"
            >
              {finishing ? 'Finishing…' : 'Finish trip'}
            </button>
          </div>
        </footer>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/10 px-1 py-1.5">
      <div className="truncate text-sm font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-sky-100">{label}</div>
    </div>
  )
}

function StopCard({
  stop,
  token,
  locked,
  open,
  onToggle,
  onSaved,
  onError,
}: {
  stop: Stop
  token: string
  locked: boolean
  open: boolean
  onToggle: () => void
  onSaved: (patch: Partial<Stop>) => void
  onError: (message: string) => void
}) {
  const [given, setGiven] = useState(stop.bottleGiven)
  const [taken, setTaken] = useState(stop.bottleTaken)
  const [cash, setCash] = useState(stop.cashCollected)
  const [note, setNote] = useState(stop.note)
  const [saving, startSaving] = useTransition()

  const submit = (status: StopStatus) => {
    startSaving(async () => {
      const res = await saveStop(token, stop.id, {
        bottleGiven: given,
        bottleTaken: taken,
        cashCollected: cash,
        note,
        status,
      })
      if (res.ok) onSaved(res.data)
      else onError(res.error)
    })
  }

  const done = stop.status !== 'pending'
  const amountDue = given * stop.rate

  return (
    <article
      className={cn(
        'overflow-hidden rounded-2xl border bg-white shadow-sm transition',
        stop.status === 'delivered' && 'border-emerald-200',
        stop.status === 'skipped' && 'border-slate-200 opacity-75',
        stop.status === 'pending' && 'border-slate-200',
        open && 'ring-2 ring-sky-300',
      )}
    >
      <button type="button" onClick={onToggle} className="flex w-full items-start gap-3 p-4 text-left">
        <div
          className={cn(
            'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
            stop.status === 'delivered' && 'bg-emerald-100 text-emerald-700',
            stop.status === 'skipped' && 'bg-slate-100 text-slate-500',
            stop.status === 'pending' && 'bg-sky-100 text-sky-700',
          )}
        >
          {stop.status === 'delivered' ? (
            <Check className="h-5 w-5" />
          ) : stop.status === 'skipped' ? (
            <SkipForward className="h-4 w-4" />
          ) : (
            <Droplets className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold">{stop.name}</h3>
            {stop.priority && (
              <span
                className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1',
                  PRIORITY_STYLES[stop.priority],
                )}
              >
                {stop.priority}
              </span>
            )}
          </div>
          <p className="truncate text-sm text-slate-600">{stop.address || '—'}</p>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>
              <b className="text-slate-700">{stop.bottlesAtHome}</b> at home
            </span>
            <span>
              Rate <b className="text-slate-700">{rupee.format(stop.rate)}</b>
            </span>
            {stop.invoiceBalance != null && stop.invoiceBalance > 0 && (
              <span className="font-medium text-red-600">Dues {rupee.format(stop.invoiceBalance)}</span>
            )}
            {done && (
              <span className="text-emerald-700">
                {stop.bottleGiven} given · {stop.bottleTaken} taken
                {stop.cashCollected > 0 && ` · ${rupee.format(stop.cashCollected)} cash`}
              </span>
            )}
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-slate-400" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />
        )}
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3">
          {stop.phone && (
            <div className="mb-3 flex gap-2">
              <a
                href={`tel:${stop.phone}`}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-medium"
              >
                <Phone className="h-4 w-4" /> Call
              </a>
              <a
                href={`https://wa.me/${stop.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 text-sm font-medium text-emerald-700"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </div>
          )}

          {locked ? (
            <p className="text-sm text-slate-500">{stop.note || 'No note.'}</p>
          ) : (
            <>
              <Stepper label="Bottles given" value={given} onChange={setGiven} />
              <Stepper label="Empty bottles taken" value={taken} onChange={setTaken} />

              <label className="mt-3 block">
                <span className="text-sm font-medium text-slate-700">Cash collected (PKR)</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={cash === 0 ? '' : cash}
                  placeholder="0"
                  onChange={(e) => setCash(Math.max(0, Number(e.target.value) || 0))}
                  className="mt-1 h-12 w-full rounded-lg border border-slate-200 px-3 text-lg tabular-nums outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                />
              </label>

              <label className="mt-3 block">
                <span className="text-sm font-medium text-slate-700">Note (optional)</span>
                <input
                  value={note}
                  maxLength={300}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Nobody home, left with guard…"
                  className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 text-base outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                />
              </label>

              <p className="mt-3 text-sm text-slate-500">
                This delivery: <b className="text-slate-800">{rupee.format(amountDue)}</b>
                {stop.bottlesAtHome + given - taken !== stop.bottlesAtHome && (
                  <>
                    {' '}
                    · will have <b className="text-slate-800">{stop.bottlesAtHome + given - taken}</b> at home
                  </>
                )}
              </p>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => submit('skipped')}
                  className="h-12 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 disabled:opacity-50"
                >
                  Skip
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => submit('delivered')}
                  className="col-span-2 h-12 rounded-xl bg-emerald-600 text-base font-semibold text-white disabled:opacity-50"
                >
                  {saving ? 'Saving…' : done ? 'Update' : 'Delivered ✓'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </article>
  )
}

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (n: number) => void
}) {
  return (
    <div className="mt-3 flex items-center justify-between">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(Math.max(0, value - 1))}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 active:bg-slate-200"
        >
          <Minus className="h-5 w-5" />
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={value}
          onChange={(e) => onChange(Math.max(0, Math.round(Number(e.target.value) || 0)))}
          className="h-11 w-14 rounded-lg border border-slate-200 text-center text-lg font-semibold tabular-nums outline-none focus:border-sky-500"
        />
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(value + 1)}
          className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-600 text-white active:bg-sky-700"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
