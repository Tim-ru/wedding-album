import * as React from 'react'
import { cn } from '../../lib/utils'

function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('ui-card', className)} data-slot="card" {...props} />
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('ui-card-header', className)} data-slot="card-header" {...props} />
  )
}

function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('ui-card-content', className)}
      data-slot="card-content"
      {...props}
    />
  )
}

export { Card, CardContent, CardHeader }
