import { headers as getHeaders } from 'next/headers.js'
import Link from 'next/link'
import { getPayload } from 'payload'
import { Droplets, LayoutDashboard, MapPin, Phone, Smartphone, Truck } from 'lucide-react'

import config from '@/payload.config'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const headers = await getHeaders()
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const [{ user }, company] = await Promise.all([
    payload.auth({ headers }),
    payload.findGlobal({ slug: 'company', depth: 0 }).catch(() => null),
  ])

  const companyName = company?.name || 'Aqua Aman'
  const phone = company?.contactNumbers?.find((c) => c.contactNumber)?.contactNumber

  return (
    <div className="min-h-dvh bg-gradient-to-b from-sky-50 via-white to-white text-slate-900">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2 font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600 text-white">
            <Droplets className="h-5 w-5" />
          </span>
          {companyName}
        </div>
        <Link
          href={payloadConfig.routes.admin}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          {user ? 'Open dashboard' : 'Staff sign in'}
        </Link>
      </header>

      <section className="mx-auto max-w-5xl px-4 pb-10 pt-8 md:pt-16">
        <p className="text-sm font-semibold uppercase tracking-wider text-sky-700">Water delivery, organised</p>
        <h1 className="mt-2 max-w-2xl text-4xl font-bold tracking-tight md:text-5xl">
          Clean drinking water, delivered on time — every time.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-slate-600">
          {companyName} predicts when each customer will run low, plans the day&apos;s route, and
          keeps invoices and payments in one place.
        </p>
        {user && (
          <p className="mt-4 text-sm text-slate-500">
            Signed in as <b>{user.email}</b>
          </p>
        )}
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-4 pb-16 md:grid-cols-3">
        <Feature
          icon={<LayoutDashboard className="h-5 w-5" />}
          title="Office dashboard"
          text="Customers, trips, invoices, expenses and live performance numbers."
          href={payloadConfig.routes.admin}
          cta="Go to admin"
        />
        <Feature
          icon={<Smartphone className="h-5 w-5" />}
          title="Driver app"
          text="Drivers open a link on their phone, tap bottles given and taken, and record cash — no paper."
          href={`${payloadConfig.routes.admin}/collections/trips`}
          cta="Open a trip to get its link"
        />
        <Feature
          icon={<Truck className="h-5 w-5" />}
          title="Smart trip planning"
          text="Each trip auto-selects customers by area, block and how soon they'll run out."
          href={`${payloadConfig.routes.admin}/collections/trips/create`}
          cta="Plan a trip"
        />
      </section>

      <footer className="border-t border-slate-100">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-slate-500">
          <span>© {new Date().getFullYear()} {companyName}</span>
          <span className="flex flex-wrap items-center gap-4">
            {company?.address && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {company.address}
              </span>
            )}
            {phone && (
              <a href={`tel:${phone}`} className="flex items-center gap-1 hover:text-slate-800">
                <Phone className="h-4 w-4" /> {phone}
              </a>
            )}
          </span>
        </div>
      </footer>
    </div>
  )
}

function Feature({
  icon,
  title,
  text,
  href,
  cta,
}: {
  icon: React.ReactNode
  title: string
  text: string
  href: string
  cta: string
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
        {icon}
      </span>
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mt-1 flex-1 text-sm text-slate-600">{text}</p>
      <Link href={href} className="mt-4 text-sm font-medium text-sky-700 hover:underline">
        {cta} →
      </Link>
    </div>
  )
}
