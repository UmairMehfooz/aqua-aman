export type StopStatus = 'pending' | 'delivered' | 'skipped'

/** One customer stop on a trip, flattened for the driver UI. */
export interface Stop {
  id: string
  customerId: string
  name: string
  address: string
  area: string
  block: string
  phone: string | null
  rate: number
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW' | null
  daysUntilDelivery: number | null
  /** Bottles the customer is holding before this delivery. */
  bottlesAtHome: number
  bottleGiven: number
  bottleTaken: number
  cashCollected: number
  note: string
  status: StopStatus
  deliveredAt: string | null
  /** Outstanding balance on the customer's latest invoice, if any. */
  invoiceBalance: number | null
  invoiceStatus: string | null
}

export interface DriverTripData {
  id: string
  token: string
  companyName: string
  tripAt: string
  from: string
  areas: string[]
  employees: string[]
  bottlesLoaded: number
  status: 'inprogress' | 'complete'
  stops: Stop[]
}

export interface SaveStopInput {
  bottleGiven: number
  bottleTaken: number
  cashCollected: number
  note: string
  status: StopStatus
}
