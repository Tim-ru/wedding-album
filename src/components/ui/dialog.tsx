import * as React from 'react'
import { cn } from '../../lib/utils'

function DialogOverlay({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('ui-dialog-overlay', className)}
      data-slot="dialog-overlay"
      {...props}
    />
  )
}

function DialogContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('ui-dialog-content', className)}
      data-slot="dialog-content"
      role="dialog"
      aria-modal="true"
      {...props}
    />
  )
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('ui-dialog-header', className)}
      data-slot="dialog-header"
      {...props}
    />
  )
}

export { DialogContent, DialogHeader, DialogOverlay }
