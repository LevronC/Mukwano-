import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) { return <button className={cn('rounded px-3 py-2', className)} {...props} /> }
