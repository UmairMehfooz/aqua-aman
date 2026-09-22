'use server'

import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { format } from 'date-fns'

import type { Trip } from '@/payload-types'
import type { SaveStopInput, Stop } from './types'

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }

const toId = (value: unknown): string | null => {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object' && 'id' in value) return String((value as { id: string }).id)
  return null
}

const clampInt = (value: unknown, max = 500) => {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.min(n, max)
}

const clampMoney = (value: unknown, max = 1_000_000) => {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.min(n, max)
}

/** Resolve a trip from its driver token. Returns null when the token is unknown. */
const findTripByToken = async (token: string): Promise<Trip | null> => {
  if (!token || !/^[a-f0-9]{24,64}$/i.test(token)) return null
  const payload = await getPayload({ config: configPromise })
  const { docs } = await payload.find({
    collection: 'trips',
    where: { driverToken: { equals: token } },
    limit: 1,
    depth: 0,
  })
  return docs[0] ?? null
}

/**
 * Record what happened at one stop: bottles given/taken, cash collected, note and status.
 * Cash collected is also posted as a payment on the customer's latest invoice so the
 * invoice balance and status update automatically (only the increase since the last save).
 */
export async function saveStop(
  token: string,
  transactionId: string,
  input: SaveStopInput,
): Promise<ActionResult<Partial<Stop>>> {
  try {
    const trip = await findTripByToken(token)
    if (!trip) return { ok: false, error: 'This driver link is not valid.' }
    if (trip.status !== 'inprogress') {
      return { ok: false, error: 'This trip has been completed and can no longer be edited.' }
    }

    const payload = await getPayload({ config: configPromise })

    const existing = await payload.findByID({
      collection: 'transaction',
      id: transactionId,
      depth: 0,
    })

    if (!existing || toId(existing.trip) !== trip.id) {
      return { ok: false, error: 'This stop does not belong to the trip.' }
    }

    const status: SaveStopInput['status'] =
      input.status === 'delivered' || input.status === 'skipped' ? input.status : 'pending'

    const bottleGiven = status === 'skipped' ? 0 : clampInt(input.bottleGiven)
    const bottleTaken = status === 'skipped' ? 0 : clampInt(input.bottleTaken)
    const cashCollected = clampMoney(input.cashCollected)
    const note = String(input.note ?? '').slice(0, 300)
    const now = new Date()

    const updated = await payload.update({
      collection: 'transaction',
      id: transactionId,
      depth: 0,
      data: {
        customer: toId(existing.customer)!,
        transactionAt: existing.transactionAt,
        bottleGiven,
        bottleTaken,
        delivery: {
          status,
          cashCollected,
          note,
          deliveredAt: status === 'pending' ? null : now.toISOString(),
        },
      },
    })

    // Post the *increase* in cash as a payment on the latest invoice.
    const previousCash = existing.delivery?.cashCollected ?? 0
    const delta = cashCollected - previousCash
    let invoiceBalance: number | null | undefined
    let invoiceStatus: string | null | undefined

    if (delta > 0) {
      const { docs: invoices } = await payload.find({
        collection: 'invoice',
        where: {
          and: [{ customer: { equals: toId(existing.customer) } }, { isLatest: { equals: true } }],
        },
        limit: 1,
        depth: 0,
      })
      const invoice = invoices[0]
      if (invoice) {
        const result = await payload.update({
          collection: 'invoice',
          id: invoice.id,
          depth: 0,
          data: {
            payments: [
              ...(invoice.payments ?? []),
              {
                type: 'cash',
                amount: delta,
                paidAt: now.toISOString(),
                comments: `Collected by driver on trip ${format(new Date(trip.tripAt), 'd MMM yyyy')}`,
              },
            ],
          },
        })
        invoiceBalance = result.totals?.balance ?? null
        invoiceStatus = result.status ?? null
      }
    }

    return {
      ok: true,
      data: {
        id: updated.id,
        bottleGiven: updated.bottleGiven,
        bottleTaken: updated.bottleTaken,
        cashCollected: updated.delivery?.cashCollected ?? 0,
        note: updated.delivery?.note ?? '',
        status: (updated.delivery?.status as SaveStopInput['status']) ?? 'pending',
        deliveredAt: updated.delivery?.deliveredAt ?? null,
        ...(invoiceBalance !== undefined ? { invoiceBalance } : {}),
        ...(invoiceStatus !== undefined ? { invoiceStatus } : {}),
      },
    }
  } catch (error) {
    console.error('[driver] saveStop failed', error)
    return { ok: false, error: error instanceof Error ? error.message : 'Could not save this stop.' }
  }
}

/** Mark the trip complete. Untouched placeholder stops (0 given / 0 taken) are removed by the trip hook. */
export async function completeTrip(token: string): Promise<ActionResult<{ status: string }>> {
  try {
    const trip = await findTripByToken(token)
    if (!trip) return { ok: false, error: 'This driver link is not valid.' }
    if (trip.status === 'complete') return { ok: true, data: { status: 'complete' } }

    const payload = await getPayload({ config: configPromise })
    const updated = await payload.update({
      collection: 'trips',
      id: trip.id,
      depth: 0,
      data: { status: 'complete' },
    })
    return { ok: true, data: { status: updated.status ?? 'complete' } }
  } catch (error) {
    console.error('[driver] completeTrip failed', error)
    return { ok: false, error: error instanceof Error ? error.message : 'Could not complete the trip.' }
  }
}
