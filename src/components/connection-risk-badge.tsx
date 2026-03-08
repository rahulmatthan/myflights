import type { ConnectionRisk } from '@/lib/connections/risk-calculator'

interface Props {
  risk: ConnectionRisk
  minutes: number
}

const config: Record<ConnectionRisk, { label: string; className: string }> = {
  relaxed: { label: 'Relaxed connection', className: 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800' },
  normal: { label: 'Normal connection', className: 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800' },
  tight: { label: 'Tight connection', className: 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-900/20 dark:border-yellow-800' },
  at_risk: { label: 'Connection at risk!', className: 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800' },
}

export default function ConnectionRiskBadge({ risk, minutes }: Props) {
  const { label, className } = config[risk]
  return (
    <div className={`text-xs font-medium px-3 py-1 rounded-full border ${className}`}>
      {label} ({minutes} min)
    </div>
  )
}
