import {
  GraduationCap,
  Laptop,
  LayoutGrid,
  Stethoscope,
  Tractor,
  Zap,
} from 'lucide-react'
import type { SectorId } from '@/components/circles/circleShowcaseModel'

const SECTORS: {
  id: Exclude<SectorId, 'other'>
  label: string
  Icon: typeof LayoutGrid
}[] = [
  { id: 'all', label: 'All Sectors', Icon: LayoutGrid },
  { id: 'healthcare', label: 'Healthcare', Icon: Stethoscope },
  { id: 'education', label: 'Education', Icon: GraduationCap },
  { id: 'agriculture', label: 'Agriculture', Icon: Tractor },
  { id: 'energy', label: 'Energy', Icon: Zap },
  { id: 'technology', label: 'Technology', Icon: Laptop },
]

type Props = {
  sector: Exclude<SectorId, 'other'>
  onSectorChange: (s: Exclude<SectorId, 'other'>) => void
  className?: string
}

export function CircleSectorFilterBar({ sector, onSectorChange, className = '' }: Props) {
  return (
    <div className={`flex flex-wrap gap-2 md:gap-2.5 ${className}`}>
      {SECTORS.map(({ id, label, Icon }) => {
        const active = sector === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSectorChange(id)}
            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-left text-[12px] font-medium transition-colors md:px-4 md:text-[13px] ${
              active
                ? 'border-[rgba(240,165,0,0.45)] bg-[rgba(240,165,0,0.14)] text-[var(--mk-offwhite)]'
                : 'border-[rgba(122,149,196,0.2)] bg-[rgba(11,22,48,0.85)] text-[var(--mk-muted)] hover:border-[rgba(240,165,0,0.25)] hover:text-[var(--mk-offwhite)]'
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 opacity-90 md:h-4 md:w-4" strokeWidth={2} />
            {label}
          </button>
        )
      })}
    </div>
  )
}
