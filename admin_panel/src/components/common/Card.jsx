export default function Card({ children, className = '', hover = false, padding = true, as: As = 'div', ...rest }) {
  return (
    <As
      className={[
        'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm',
        hover ? 'transition-shadow duration-200 hover:shadow-md' : '',
        padding ? 'p-3.5' : '',
        className,
      ].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </As>
  );
}
