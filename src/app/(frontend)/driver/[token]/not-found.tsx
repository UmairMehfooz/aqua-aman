import { Droplets } from 'lucide-react'

export default function DriverNotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-6 text-center text-slate-700">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
        <Droplets className="h-7 w-7" />
      </span>
      <h1 className="mt-4 text-xl font-semibold">This driver link is not valid</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        The link may have been typed incorrectly or the trip was removed. Ask the office to send
        the link again.
      </p>
    </div>
  )
}
