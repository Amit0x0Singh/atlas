const THEME = {
  amber:  { border: 'border-amber-300',  bg: 'bg-amber-50',  title: 'text-amber-800',  body: 'text-amber-700' },
  orange: { border: 'border-orange-300', bg: 'bg-orange-50', title: 'text-orange-800', body: 'text-orange-700' },
}

// Covers both "no stock at all" and "stock insufficient" cases — same
// shortage banner, just a different theme/message.
export default function StockShortageBanner({ theme, title, message }) {
  const t = THEME[theme]
  return (
    <div className={`rounded-xl border ${t.border} ${t.bg} px-4 py-3`}>
      <p className={`text-xs font-bold ${t.title}`}>{title}</p>
      <p className={`text-xs ${t.body} mt-0.5 leading-relaxed`}>{message}</p>
    </div>
  )
}
