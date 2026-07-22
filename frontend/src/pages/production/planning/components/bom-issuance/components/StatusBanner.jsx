import { CheckCircle, AlertCircle, Loader, X } from 'lucide-react'

const BANNER_CLS = {
  loading: 'bg-blue-50 border-blue-200 text-blue-800',
  success: 'bg-green-50 border-green-200 text-green-800',
  error:   'bg-red-50 border-red-200 text-red-700',
}

export default function StatusBanner({ banner, onDismiss }) {
  if (!banner) return null
  return (
    <div className={`px-5 py-2.5 border-b flex items-center gap-2 text-[13px] font-medium flex-shrink-0 ${BANNER_CLS[banner.type]}`}>
      {banner.type === 'loading' && <Loader size={14} className="animate-spin flex-shrink-0" />}
      {banner.type === 'success' && <CheckCircle size={14} className="flex-shrink-0" />}
      {banner.type === 'error'   && <AlertCircle size={14} className="flex-shrink-0" />}
      <span>{banner.msg}</span>
      {banner.type !== 'loading' && (
        <button onClick={onDismiss} className="ml-auto opacity-60 hover:opacity-100 flex-shrink-0"><X size={14} /></button>
      )}
    </div>
  )
}
