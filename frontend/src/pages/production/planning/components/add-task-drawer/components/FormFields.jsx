export function Field({ label, children, hint }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</label>
      {children}
      {hint && <span className="text-[10px] text-gray-400">{hint}</span>}
    </div>
  )
}

export function Inp({ className = '', ...props }) {
  return (
    <input {...props}
      className={`px-3 py-2 border-[1.5px] border-gray-200 rounded-lg text-sm font-[inherit] text-gray-800 bg-white
        focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition ${className}`}
    />
  )
}
export function Sel({ className = '', ...props }) {
  return (
    <select {...props}
      className={`px-3 py-2 border-[1.5px] border-gray-200 rounded-lg text-sm font-[inherit] text-gray-800 bg-white
        focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition ${className}`}
    />
  )
}
export function SecLabel({ children }) {
  return (
    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-1.5 mb-2.5 mt-4">
      {children}
    </div>
  )
}
