import * as React from 'react'
import { cn } from '../../lib/utils'

type ButtonVariant = 'default' | 'secondary' | 'ghost' | 'destructive'
type ButtonSize = 'default' | 'icon' | 'sm'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'ui-button',
        `ui-button--${variant}`,
        `ui-button--${size}`,
        className,
      )}
      data-slot="button"
      {...props}
    />
  )
}

export { Button }
