import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import type { Area, Block, Customer, Employee } from '@/payload-types'
import { DriverTrip } from './DriverTrip'
import type { DriverTripData, Stop, StopStatus } from '../types'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Driver App',
  description: 'Record deliveries for a trip.',
}

const nameOf = (value: unknown): string => {
  if (!value || typeof value !== 'object') return ''
  return String((value as { name?: string }).name ?? '')
}

const idOf = (value: unknown): string => {
  if (!value) return ''
  if (typeof value === 'string') return value
  return String((value as { id: string }).id ?? '')
}

export default async function DriverPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!/^[a-f0-9]{24,64}$/i.test(token)) notFound()

  const payload = await getPayload({ config: configPromise })

  const { docs: trips } = await payload.find({
    collection: 'trips',
    where: { driverToken: { equals: token } },
    limit: 1,
    depth: 1,
  })
  const trip = trips[0]
  if (!trip) notFound()

  const [company, { docs: transactions }] = await Promise.all([
    payload.findGlobal({ slug: 'company', depth: 0 }),
    payload.find({
      collection: 'transaction',
      where: { trip: { equals: trip.id } },
      depth: 2,
      pagination: false,
      sort: 'analytics.daysUntilDelivery',
    }),
  ])

  const customerIds = transactions.map((t) => idOf(t.customer)).filter(Boolean)

  const { docs: invoices } = customerIds.length
    ? await payload.find({
        collection: 'invoice',
        where: { and: [{ customer: { in: customerIds } }, { isLatest: { equals: true } }] },
        depth: 0,
        pagination: false,
        select: { customer: true, status: true, totals: true },
      })
    : { docs: [] }

  const invoiceByCustomer = new Map(invoices.map((inv) => [idOf(inv.customer), inv]))

  const stops: Stop[] = transactions.map((t) => {
    const customer = (typeof t.customer === 'object' ? t.customer : null) as Customer | null
    const invoice = invoiceByCustomer.get(idOf(t.customer))
    const whatsapp = customer?.contactNumbers?.find((c) => c.contactNumber)?.contactNumber ?? null

    return {
      id: t.id,
      customerId: idOf(t.customer),
      name: customer?.name ?? 'Unknown customer',
      address: customer?.address ?? '',
      area: nameOf(customer?.area as Area | string | undefined),
      block: nameOf(customer?.block as Block | string | undefined),
      phone: whatsapp,
      rate: customer?.rate ?? 0,
      priority: (t.analytics?.priority as Stop['priority']) ?? null,
      daysUntilDelivery: t.analytics?.daysUntilDelivery ?? null,
      bottlesAtHome: t.remainingBottles ?? customer?.bottlesAtHome ?? 0,
      bottleGiven: t.bottleGiven ?? 0,
      bottleTaken: t.bottleTaken ?? 0,
      cashCollected: t.delivery?.cashCollected ?? 0,
      note: t.delivery?.note ?? '',
      status: (t.delivery?.status as StopStatus) ?? 'pending',
      deliveredAt: t.delivery?.deliveredAt ?? null,
      invoiceBalance: invoice?.totals?.balance ?? null,
      invoiceStatus: invoice?.status ?? null,
    }
  })

  const data: DriverTripData = {
    id: trip.id,
    token,
    companyName: company?.name || 'Aqua Aman',
    tripAt: String(trip.tripAt),
    from: trip.from,
    areas: (trip.areas as (Area | string)[]).map(nameOf).filter(Boolean),
    employees: (trip.employee as (Employee | string)[]).map(nameOf).filter(Boolean),
    bottlesLoaded: trip.bottles,
    status: trip.status === 'complete' ? 'complete' : 'inprogress',
    stops,
  }

  return <DriverTrip initial={data} />
}
