import * as React from 'react'
import { cn } from '../../lib/utils'

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('ui-input', className)} data-slot="input" {...props} />
}

export { Input }
