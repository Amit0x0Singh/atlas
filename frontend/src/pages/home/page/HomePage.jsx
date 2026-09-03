import { useMemo } from 'react'
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
      <div className="mx-auto max-w-5xl px-4 md:px-6 py-8 md:py-12">
        {/* Welcome card */}
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-6 md:p-9 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70">{dateLine}</p>
          <h1 className="mt-2 text-2xl md:text-3xl font-bold">
            {greeting(now)}, {firstName}.
          </h1>
          <p className="mt-2 text-sm md:text-base text-white/90 max-w-xl">{note}</p>

          {chips.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {chips.map((c) => (
                <span key={c} className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">{c}</span>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400">Jump back in</h2>
          {shortcuts.length > 0 ? (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
