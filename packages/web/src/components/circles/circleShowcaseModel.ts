import { CIRCLE_COVER_PRESETS } from '@/components/circles/circleCoverPresets'

export type SectorId = 'all' | 'healthcare' | 'education' | 'agriculture' | 'energy' | 'technology' | 'other'

export type ExploreCircleRow = {
  id: string
  name: string
  description?: string | null
  /** When set (from create flow), drives sector filters instead of inferring from name/description. */
  sector?: string | null
  country?: string | null
  goalAmount: string
  status: string
  currency: string
  coverImageUrl?: string | null
  /** Sum of verified contribution amounts (same currency as circle goal). */
  verifiedRaisedAmount?: string | null
}

export type EnrichedCircle = ExploreCircleRow & {
  inferred: Exclude<SectorId, 'all'>
  imageSrc: string
  goal: number
  raised: number
}

/** Preset covers first, then legacy fallbacks for hash-based assignment. */
export const IMAGE_POOL = [
  ...CIRCLE_COVER_PRESETS,
  'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=800&q=80',
  '/assets/landing/hero-expand-ghana.png',
  'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
  '/assets/landing/showcase-urban.png',
]

const SECTOR_KEYWORDS: Record<Exclude<SectorId, 'all' | 'other'>, RegExp> = {
  healthcare: /health|clinic|medical|hospital|care|maternal|vacc/i,
  education: /school|edu|learn|scholar|stem|library|student/i,
  agriculture: /farm|crop|irrigation|agri|harvest|co-?op/i,
  energy: /solar|energy|power|grid|renewable|panel/i,
  technology: /tech|digital|software|fintech|data|lab|code/i,
}

export function inferSector(name: string, description: string | null | undefined): Exclude<SectorId, 'all'> {
  const text = `${name} ${description ?? ''}`
  for (const [id, re] of Object.entries(SECTOR_KEYWORDS) as [keyof typeof SECTOR_KEYWORDS, RegExp][]) {
    if (re.test(text)) return id
  }
  return 'other'
}

/** Maps onboarding sector labels to explore filter ids (see `ONBOARDING_SECTORS` on the web). */
export function onboardingSectorLabelToFilterId(
  label: string
): Exclude<SectorId, 'all'> | null {
  const map: Record<string, Exclude<SectorId, 'all'>> = {
    Healthcare: 'healthcare',
    Education: 'education',
    Agriculture: 'agriculture',
    Technology: 'technology',
    'Clean Energy': 'energy',
    Infrastructure: 'other'
  }
  return map[label] ?? null
}

export function sectorLabel(s: Exclude<SectorId, 'all'>): string {
  const map: Record<Exclude<SectorId, 'all'>, string> = {
    healthcare: 'Healthcare',
    education: 'Education',
    agriculture: 'Agriculture',
    energy: 'Energy',
    technology: 'Technology',
    other: 'Community',
  }
  return map[s]
}

export function pickImage(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * (i + 1)) % 997
  return IMAGE_POOL[Math.abs(h) % IMAGE_POOL.length]
}

export function parseGoal(goalAmount: string | undefined | null): number {
  const n = Number.parseFloat(String(goalAmount ?? '0').replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}

export function progressPct(raised: number, goal: number): number {
  if (goal <= 0) return 0
  return Math.min(100, Math.round((raised / goal) * 100))
}

/** Normalize API circle rows into the showcase card model (same image + sector + progress logic as Explore). */
export function enrichCircleForShowcase(c: {
  id: string
  name: string
  description?: string | null
  sector?: string | null
  goalAmount?: string | null
  status: string
  currency?: string | null
  coverImageUrl?: string | null
  verifiedRaisedAmount?: string | null
}): EnrichedCircle {
  const goalAmount = String(c.goalAmount ?? '0')
  const currency = c.currency ?? 'USD'
  const inferredFromText = inferSector(c.name, c.description)
  const fromStored = c.sector ? onboardingSectorLabelToFilterId(c.sector) : null
  const inferred = (fromStored ?? inferredFromText) as Exclude<SectorId, 'all'>
  const stored = typeof c.coverImageUrl === 'string' ? c.coverImageUrl.trim() : ''
  const imageSrc = stored.length > 0 ? stored : pickImage(c.id)
  const raised = parseGoal(c.verifiedRaisedAmount ?? '0')
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    goalAmount,
    status: c.status,
    currency,
    coverImageUrl: c.coverImageUrl ?? null,
    inferred,
    imageSrc,
    goal: parseGoal(goalAmount),
    raised,
  }
}
