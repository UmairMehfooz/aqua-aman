import type { SanitizedConfig } from 'payload'
import payload from 'payload'
import { subDays } from 'date-fns'

/**
 * Demo data for exploring Aqua Aman: a few areas/blocks, customers, one driver and one trip.
 *
 *   pnpm payload seed-demo          # create (idempotent: skips if demo data exists)
 *   pnpm payload seed-demo --clear  # remove everything this script created
 *
 * Everything is tagged with the "[demo]" prefix or the DEMO_ADDRESS_TAG so it can be removed safely.
 */
const TAG = '[demo]'

const AREAS: Record<string, string[]> = {
  'DHA Phase 6': ['Block A', 'Block B'],
  'Gulshan-e-Iqbal': ['Block 13-D', 'Block 10-A'],
}

const CUSTOMERS = [
  { name: 'Ahmed Raza', area: 'DHA Phase 6', block: 'Block A', address: 'House 12, Street 4', rate: 120, bottlesAtHome: 3, phone: '03001234567', days: 15 },
  { name: 'Sana Iqbal', area: 'DHA Phase 6', block: 'Block A', address: 'House 27, Street 9', rate: 120, bottlesAtHome: 1, phone: '03011234567', days: 4 },
  { name: 'Bilal Traders', area: 'DHA Phase 6', block: 'Block B', address: 'Shop 5, Commercial Lane', rate: 110, bottlesAtHome: 6, phone: '03021234567', days: 9 },
  { name: 'Farah Khan', area: 'DHA Phase 6', block: 'Block B', address: 'Flat 302, Sea Breeze Apts', rate: 130, bottlesAtHome: 0, phone: null, days: 3 },
  { name: 'Usman Ali', area: 'Gulshan-e-Iqbal', block: 'Block 13-D', address: 'House 88, Lane 2', rate: 100, bottlesAtHome: 2, phone: '03031234567', days: 6 },
  { name: 'Al-Noor Clinic', area: 'Gulshan-e-Iqbal', block: 'Block 10-A', address: 'Plot 14, Main Road', rate: 100, bottlesAtHome: 8, phone: '03041234567', days: 12 },
]

export const script = async (config: SanitizedConfig) => {
  await payload.init({ config })
  const clear = process.argv.includes('--clear')

  if (clear) {
    await clearDemo()
  } else {
    await seedDemo()
  }
  process.exit(0)
}

async function clearDemo() {
  const { docs: customers } = await payload.find({
    collection: 'customers',
    where: { address: { contains: TAG } },
    pagination: false,
    depth: 0,
  })
  const customerIds = customers.map((c) => c.id)

  const { docs: trips } = await payload.find({
    collection: 'trips',
    where: { from: { contains: TAG } },
    pagination: false,
    depth: 0,
  })

  // Order matters: deletion hooks block removing anything that is still referenced.
  if (customerIds.length) {
    await payload.delete({ collection: 'invoice', where: { customer: { in: customerIds } } })
    await payload.delete({ collection: 'transaction', where: { customer: { in: customerIds } } })
  }
  for (const trip of trips) {
    await payload.delete({ collection: 'transaction', where: { trip: { equals: trip.id } } })
    await payload.delete({ collection: 'trips', id: trip.id })
  }
  for (const id of customerIds) {
    await payload.delete({ collection: 'customers', id })
  }
  await payload.delete({ collection: 'employee', where: { address: { contains: TAG } } })
  await payload.delete({ collection: 'blocks', where: { name: { contains: TAG } } })
  await payload.delete({ collection: 'areas', where: { name: { contains: TAG } } })

  payload.logger.info(`Removed demo data: ${customerIds.length} customers, ${trips.length} trips.`)
}

async function seedDemo() {
  const existing = await payload.count({
    collection: 'customers',
    where: { address: { contains: TAG } },
  })
  if (existing.totalDocs > 0) {
    payload.logger.info('Demo data already present. Run with --clear to remove it first.')
    return
  }

  // Company details are only set if the global is still empty.
  const company = await payload.findGlobal({ slug: 'company', depth: 0 })
  if (!company?.name) {
    await payload.updateGlobal({
      slug: 'company',
      data: {
        name: 'Aqua Aman',
        address: 'Karachi, Pakistan',
        contactNumbers: [{ type: 'whatsapp', contactNumber: '+923001234567' }],
        invoiceMessage: 'Thank you for choosing Aqua Aman.',
      },
    })
  }

  const areaIds: Record<string, string> = {}
  const blockIds: Record<string, string> = {}

  for (const [areaName, blocks] of Object.entries(AREAS)) {
    const area = await payload.create({
      collection: 'areas',
      data: { name: `${areaName} ${TAG}` },
    })
    areaIds[areaName] = area.id
    for (const blockName of blocks) {
      const block = await payload.create({
        collection: 'blocks',
        data: { name: `${blockName} ${TAG}`, area: area.id },
      })
      blockIds[`${areaName}/${blockName}`] = block.id
    }
  }

  const driver = await payload.create({
    collection: 'employee',
    data: {
      name: 'Imran (driver)',
      address: `Karachi ${TAG}`,
      contactNumber: '+923051234567',
      nic: '42101-1234567-1',
      salary: 35000,
    },
  })

  const customerIds: string[] = []
  for (const c of CUSTOMERS) {
    const customer = await payload.create({
      collection: 'customers',
      data: {
        name: c.name,
        address: `${c.address} ${TAG}`,
        area: areaIds[c.area],
        block: blockIds[`${c.area}/${c.block}`],
        rate: c.rate,
        bottlesAtHome: c.bottlesAtHome,
        status: 'active',
        type: 'delivery',
        deliveryDay: ['monday', 'thursday'],
        contactNumbers: c.phone ? [{ type: 'whatsapp', contactNumber: c.phone }] : [],
      },
    })
    customerIds.push(customer.id)

    // One past delivery so the consumption model has something to work with.
    await payload.create({
      collection: 'transaction',
      data: {
        customer: customer.id,
        status: 'unpaid',
        bottleGiven: Math.max(2, c.bottlesAtHome),
        bottleTaken: Math.max(1, c.bottlesAtHome - 1),
        total: 0,
        transactionAt: subDays(new Date(), c.days).toISOString(),
      },
    })
  }

  // A trip covering both areas; the trip hook turns matching customers into stops.
  const trip = await payload.create({
    collection: 'trips',
    data: {
      from: `Aqua Aman Plant ${TAG}`,
      areas: Object.values(areaIds),
      bottles: 40,
      tripAt: new Date().toISOString(),
      employee: [driver.id],
      status: 'inprogress',
      priority: ['URGENT', 'HIGH', 'MEDIUM', 'LOW'],
    },
  })

  const stops = await payload.count({ collection: 'transaction', where: { trip: { equals: trip.id } } })

  payload.logger.info(
    `Seeded ${CUSTOMERS.length} customers, 1 driver, 1 trip with ${stops.totalDocs} stops.`,
  )
  payload.logger.info(`Driver App: ${process.env.URL || 'http://localhost:3000'}/driver/${trip.driverToken}`)
}
