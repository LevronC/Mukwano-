import type { TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea className={cn('w-full rounded border p-2', props.className)} {...props} /> }
