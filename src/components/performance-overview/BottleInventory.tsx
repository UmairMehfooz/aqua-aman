import React from 'react'
import { CustomComponent, PayloadServerReactComponent } from 'payload'

import { OverviewCard } from './OverviewCard'

/**
 * Bottle Inventory — where the plant's 19L bottles are right now.
 *
 * - At customers: for every active customer, the `remainingBottles` of their latest
 *   transaction (or `bottlesAtHome` if they have never had a transaction).
 * - Out on trips: bottles loaded onto trips that are still in progress, and how many
 *   of those have already been handed over.
 * - Lost: bottles charged as lost on invoices.
 */
const BottleInventory: PayloadServerReactComponent<CustomComponent> = async ({ payload }) => {
  const db = payload.db.collections

  const [customerAgg, tripAgg, lostAgg] = await Promise.all([
    db['customers'].aggregate([
      {
        $match: {
          status: 'active',
          $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
        },
      },
      {
        $lookup: {
          from: 'transactions',
          let: { customerId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$customer', '$$customerId'] } } },
            { $sort: { transactionAt: -1 } },
            { $limit: 1 },
            { $project: { remainingBottles: 1 } },
          ],
          as: 'latest',
        },
      },
      {
        $addFields: {
          held: {
            $ifNull: [{ $first: '$latest.remainingBottles' }, { $ifNull: ['$bottlesAtHome', 0] }],
          },
        },
      },
      {
        $group: {
          _id: null,
          bottlesAtCustomers: { $sum: '$held' },
          customers: { $sum: 1 },
          customersHolding: { $sum: { $cond: [{ $gt: ['$held', 0] }, 1, 0] } },
        },
      },
    ]),
    db['trips'].aggregate([
      { $match: { status: 'inprogress' } },
      {
        $lookup: {
          from: 'transactions',
          localField: '_id',
          foreignField: 'trip',
          as: 'transactions',
        },
      },
      {
        $group: {
          _id: null,
          trips: { $sum: 1 },
          loaded: { $sum: '$bottles' },
          given: { $sum: { $sum: '$transactions.bottleGiven' } },
          taken: { $sum: { $sum: '$transactions.bottleTaken' } },
        },
      },
    ]),
    db['invoices'].aggregate([
      { $group: { _id: null, lost: { $sum: { $ifNull: ['$lost.count', 0] } } } },
    ]),
  ])

  const customers = customerAgg[0] ?? { bottlesAtCustomers: 0, customers: 0, customersHolding: 0 }
  const trips = tripAgg[0] ?? { trips: 0, loaded: 0, given: 0, taken: 0 }
  const lost = lostAgg[0]?.lost ?? 0

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-semibold">Bottle Inventory</h2>
          <p className="text-muted-foreground text-sm">Where your 19L bottles are right now</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <OverviewCard
          title="At customers"
          value={customers.bottlesAtCustomers.toLocaleString()}
          description={`${customers.customersHolding} of ${customers.customers} active customers holding bottles`}
          secondaryDescription="From each customer's latest transaction"
        />
        <OverviewCard
          title="Out on trips"
          value={trips.loaded.toLocaleString()}
          description={`${trips.trips} trip${trips.trips === 1 ? '' : 's'} in progress`}
          secondaryDescription={`${trips.given} handed over · ${trips.taken} empties collected so far`}
        />
        <OverviewCard
          title="Still on the truck"
          value={Math.max(0, trips.loaded - trips.given).toLocaleString()}
          description="Loaded minus given on in-progress trips"
          secondaryDescription="Drops as drivers record deliveries"
        />
        <OverviewCard
          title="Lost bottles"
          value={lost.toLocaleString()}
          description="Charged to customers on invoices"
          secondaryDescription="All time"
        />
      </div>
    </div>
  )
}

export default BottleInventory
