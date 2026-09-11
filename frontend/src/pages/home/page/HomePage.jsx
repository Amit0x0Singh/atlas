import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, UserRound } from 'lucide-react'
import { useApp } from '../../../context/context.jsx'
import { APP_NAV } from '../../../components/menu-bar/data/navData.js'
import { permissionForPath } from '../../../routes/operationMap.js'

// One line per weekday (0 = Sunday … 6 = Saturday). Kept deliberately warm
// and generic — no numbers, no targets, just a friendly nudge that changes
// as the week goes on so the page doesn't feel static.
const WEEKLY_NOTES = [
  'A new week is almost here — hope you got some rest.',            // Sun
  'Fresh week, fresh start. Let’s make it a good one.',          // Mon
  'Into the swing of the week now — nice and steady.',              // Tue
  'Midweek already. Thanks for keeping things moving.',             // Wed
  'Almost through the week — your work keeps the plant running.',   // Thu
  'It’s Friday. Finish strong and enjoy the weekend.',           // Fri
  'Thanks for everything this week. Take it easy today.',           // Sat
]

function greeting(d = new Date()) {
  const h = d.getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

const titleCase = (s) =>
  String(s || '').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())

// A live, LCD-style digital clock — ticks every second, colon blinks with
// it. Kept local to this page since nothing else needs a live clock.
function DigitalClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const h24  = now.getHours()
  const hh   = String(((h24 + 11) % 12) + 1).padStart(2, '0')
  const mm   = String(now.getMinutes()).padStart(2, '0')
  const ss   = String(now.getSeconds()).padStart(2, '0')
  const ampm = h24 < 12 ? 'AM' : 'PM'
  const blink = now.getSeconds() % 2 === 0

  return (
    <div className="shrink-0 w-full sm:w-auto bg-slate-900 rounded-2xl px-4 py-2.5 sm:px-4 sm:py-3 ring-1 ring-white/10 shadow-lg shadow-slate-900/20">
      <div className="flex items-baseline justify-center sm:justify-start gap-0.5 font-mono tabular-nums text-white text-xl sm:text-2xl font-bold tracking-wide"
        style={{ textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>
        <span>{hh}</span>
        <span className={`transition-opacity ${blink ? 'opacity-100' : 'opacity-25'}`}>:</span>
        <span>{mm}</span>
        <span className={`transition-opacity ${blink ? 'opacity-100' : 'opacity-25'}`}>:</span>
        <span>{ss}</span>
        <span className="ml-1.5 self-start mt-0.5 text-[10px] font-sans font-bold text-white/70">{ampm}</span>
      </div>
    </div>
  )
}

export default function HomePage() {
  const { user, hasPermission } = useApp()

  const now = new Date()
  const firstName = titleCase((user?.fullName || '').split(/\s+/)[0]) || 'there'
  const note = WEEKLY_NOTES[now.getDay()]
  const dateLine = now.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  // Roles + plant names as one row of chips, de-duplicated case-insensitively
  // (a role is often named after the plant, e.g. role "Nano plant" + plant
  // "Nano" — don't show near-identical chips twice).
  const chips = useMemo(() => {
    const seen = new Set()
    const out = []
    for (const label of [...(user?.roles || []), ...(user?.plants || [])]) {
      const key = String(label).trim().toLowerCase().replace(/\s+(plant|plants)$/, '')
      if (!label || seen.has(key)) continue
      seen.add(key)
      out.push(label)
    }
    return out
  }, [user])

  // The pages this account can actually open — same permission check the
  // sidebar uses — shown as quick-launch cards.
  const shortcuts = useMemo(() => {
    const out = []
    for (const { group, items } of APP_NAV) {
      for (const it of items) {
        if (it.soon) continue
        const perm = it.permission || permissionForPath(it.to)
        if (!perm || hasPermission(perm)) out.push({ ...it, group })
      }
    }
    return out
  }, [hasPermission])

  return (
    <div className="min-h-full bg-gray-50">
      <div className="w-full px-4 md:px-8 py-8 md:py-12">
        {/* Welcome card */}
        <div
          className="rounded-2xl p-6 md:p-9 shadow-sm"
          style={{ backgroundImage: 'linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%)' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-600/80">{dateLine}</p>
              <h1 className="mt-2 text-2xl md:text-3xl font-bold text-slate-800">
                {greeting(now)}, {firstName}.
              </h1>
              <p className="mt-2 text-sm md:text-base text-slate-600 max-w-xl">{note}</p>

              {chips.length > 0 && (
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {chips.map((c) => (
                    <span key={c} className="rounded-full bg-white/60 backdrop-blur-sm ring-1 ring-white/60 text-slate-700 px-2.5 py-1 text-xs font-semibold">{c}</span>
                  ))}
                </div>
              )}
            </div>

            <DigitalClock />
          </div>
        </div>

        {/* Quick links */}
        <div className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400">Jump back in</h2>
          {shortcuts.length > 0 ? (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
              {shortcuts.map(({ to, label, Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3.5 hover:border-indigo-300 hover:shadow-sm transition-all"
                >
                  <span className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    {Icon ? <Icon size={17} strokeWidth={2.2} /> : <ArrowRight size={17} />}
                  </span>
                  <span className="flex-1 text-sm font-semibold text-gray-800">{label}</span>
                  <ArrowRight size={15} className="text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-500">
              Your account doesn&apos;t have any modules assigned yet. Contact your administrator if you think this is wrong.
            </p>
          )}
        </div>

        <div className="mt-6">
          <Link to="/profile" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
            <UserRound size={15} /> View my profile
          </Link>
        </div>
      </div>
    </div>
  )
}
