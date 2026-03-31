import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
export function Input(props: InputHTMLAttributes<HTMLInputElement>) { return <input className={cn('w-full rounded border p-2', props.className)} {...props} /> }
