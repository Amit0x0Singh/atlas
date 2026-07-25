import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary:       'bg-blue-600 hover:bg-blue-700 text-white border-transparent shadow-sm',
  secondary:     'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
  ghost:         'bg-transparent hover:bg-slate-100 text-slate-600 border-transparent dark:hover:bg-slate-800 dark:text-slate-300',
  danger:        'bg-red-50 hover:bg-red-100 text-red-600 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900',
  'danger-solid':'bg-red-600 hover:bg-red-700 text-white border-transparent shadow-sm',
};

const SIZES = {
  sm: { btn: 'px-2.5 py-1.5 text-xs gap-1.5', icon: 14 },
  md: { btn: 'px-3.5 py-2 text-sm gap-2',     icon: 15 },
  lg: { btn: 'px-5 py-2.5 text-sm gap-2',     icon: 16 },
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  type = 'button',
  onClick,
  ...rest
}) {
  const v = VARIANTS[variant] ?? VARIANTS.primary;
  const s = SIZES[size] ?? SIZES.md;
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center font-medium rounded-lg border whitespace-nowrap',
        'transition-all duration-150 active:scale-[0.97]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
        v, s.btn,
        isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer',
        fullWidth ? 'w-full' : '',
        className,
      ].filter(Boolean).join(' ')}
      {...rest}
    >
      {loading
        ? <Loader2 size={s.icon} className="animate-spin flex-shrink-0" />
        : Icon && iconPosition === 'left' && <Icon size={s.icon} className="flex-shrink-0" />
      }
      {children}
      {!loading && Icon && iconPosition === 'right' && <Icon size={s.icon} className="flex-shrink-0" />}
    </button>
  );
}
