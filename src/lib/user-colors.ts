export const USER_COLORS = [
  'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'indigo', 'purple', 'pink',
] as const

export type UserColor = typeof USER_COLORS[number]

export function colorBg(color: string | null | undefined) {
  switch (color) {
    case 'red': return 'bg-red-400'
    case 'orange': return 'bg-orange-400'
    case 'yellow': return 'bg-yellow-400'
    case 'green': return 'bg-green-400'
    case 'teal': return 'bg-teal-400'
    case 'blue': return 'bg-blue-400'
    case 'indigo': return 'bg-indigo-400'
    case 'purple': return 'bg-purple-400'
    case 'pink': return 'bg-pink-400'
    default: return 'bg-blue-400'
  }
}

export function colorCardBorder(color: string | null | undefined) {
  switch (color) {
    case 'red': return 'border-l-red-400'
    case 'orange': return 'border-l-orange-400'
    case 'yellow': return 'border-l-yellow-400'
    case 'green': return 'border-l-green-400'
    case 'teal': return 'border-l-teal-400'
    case 'blue': return 'border-l-blue-400'
    case 'indigo': return 'border-l-indigo-400'
    case 'purple': return 'border-l-purple-400'
    case 'pink': return 'border-l-pink-400'
    default: return 'border-l-blue-400'
  }
}

export function colorCardBg(color: string | null | undefined) {
  switch (color) {
    case 'red': return 'bg-red-50 dark:bg-red-950/20'
    case 'orange': return 'bg-orange-50 dark:bg-orange-950/20'
    case 'yellow': return 'bg-yellow-50 dark:bg-yellow-950/20'
    case 'green': return 'bg-green-50 dark:bg-green-950/20'
    case 'teal': return 'bg-teal-50 dark:bg-teal-950/20'
    case 'blue': return 'bg-blue-50 dark:bg-blue-950/20'
    case 'indigo': return 'bg-indigo-50 dark:bg-indigo-950/20'
    case 'purple': return 'bg-purple-50 dark:bg-purple-950/20'
    case 'pink': return 'bg-pink-50 dark:bg-pink-950/20'
    default: return 'bg-blue-50 dark:bg-blue-950/20'
  }
}
