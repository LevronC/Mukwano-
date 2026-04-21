export type CommunityNewsType = 'circle' | 'project' | 'proposal' | 'contribution'

export type CommunityNewsItem = {
  id: string
  title: string
  description: string
  type: CommunityNewsType
  createdAt: string
  imageUrl: string
  /** In-app destination until items are backed by real circle/project IDs. */
  href: string
}

export type TrendingCategory = 'Tech' | 'Investment' | 'Startup' | 'Finance'

export type TrendingItem = {
  id: string
  region: string
  title: string
  subtitle: string
  category: TrendingCategory
  imageUrl: string
  url: string
  publishedAt: string
}

/** Internal circle / project activity — demo editorial layer (replace with API later). */
export const communityNews: CommunityNewsItem[] = [
  {
    id: 'cn-1',
    title: 'Kitgum Lab Phase 2 complete',
    description:
      'The diagnostic laboratory in Northern Uganda has completed its secondary construction phase, bringing advanced testing closer to the community.',
    type: 'project',
    createdAt: '2026-04-18T10:00:00.000Z',
    imageUrl:
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
    href: '/explore#explore-circles',
  },
  {
    id: 'cn-2',
    title: 'New water project in Nairobi',
    description: 'Community-led borehole initiative goes live next week with committee oversight on procurement.',
    type: 'circle',
    createdAt: '2026-04-17T08:30:00.000Z',
    imageUrl:
      'https://images.unsplash.com/photo-1545558014-8692077e9d5c?w=600&q=80',
    href: '/circles',
  },
  {
    id: 'cn-3',
    title: 'E-learning grant approved',
    description: 'Matching funds secured for ten partner schools; voting closed unanimously last Friday.',
    type: 'proposal',
    createdAt: '2026-04-16T14:15:00.000Z',
    imageUrl:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&q=80',
    href: '/circles',
  },
  {
    id: 'cn-4',
    title: 'Kigali fintech circle opens public review',
    description: 'Members can comment on treasury guardrails before the next funding window opens.',
    type: 'circle',
    createdAt: '2026-04-15T09:00:00.000Z',
    imageUrl:
      'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80',
    href: '/circles',
  },
  {
    id: 'cn-5',
    title: 'Lagos market modernization: Phase 1 funded',
    description: 'Contributions crossed the threshold; execution checklist is now with the steering committee.',
    type: 'contribution',
    createdAt: '2026-04-14T11:45:00.000Z',
    imageUrl:
      'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=600&q=80',
    href: '/circles',
  },
  {
    id: 'cn-6',
    title: 'Accra solar micro-grid proposal extended',
    description: 'Discussion period extended by one week to align with a partner diligence report.',
    type: 'proposal',
    createdAt: '2026-04-12T16:20:00.000Z',
    imageUrl:
      'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600&q=80',
    href: '/circles',
  },
]

/** Regional + global tech & investment mix — demo editorial layer (replace with API later). */
export const trendingAfrica: TrendingItem[] = [
  {
    id: 'tr-1',
    region: 'Nairobi',
    title: 'Silicon Savannah micro-equity round opens',
    subtitle: 'East African SaaS founders report strong early commitments from diaspora LPs.',
    category: 'Tech',
    imageUrl:
      'https://images.unsplash.com/photo-1486406146926-c627a92ad378?w=400&q=80',
    url: 'https://www.reuters.com/technology/',
    publishedAt: '2026-04-20T07:00:00.000Z',
  },
  {
    id: 'tr-2',
    region: 'Global VC',
    title: 'Cross-border fintech funding holds steady Q2',
    subtitle: 'Analysts note resilient pipeline for payments and embedded finance in emerging markets.',
    category: 'Investment',
    imageUrl:
      'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&q=80',
    url: 'https://www.reuters.com/markets/',
    publishedAt: '2026-04-19T12:00:00.000Z',
  },
  {
    id: 'tr-3',
    region: 'Kigali',
    title: 'Green export co-op adds traceability layer',
    subtitle: 'Members vote to pilot blockchain-backed certificates for EU buyers.',
    category: 'Startup',
    imageUrl:
      'https://images.unsplash.com/photo-1595475884562-073c30d45670?w=400&q=80',
    url: 'https://www.reuters.com/world/africa/',
    publishedAt: '2026-04-18T09:30:00.000Z',
  },
  {
    id: 'tr-4',
    region: 'Lagos',
    title: 'Eko market digitization Phase 2',
    subtitle: 'Committee schedules vendor onboarding as voting window opens this week.',
    category: 'Finance',
    imageUrl:
      'https://images.unsplash.com/photo-1555529669-2269762592b0?w=400&q=80',
    url: 'https://www.reuters.com/markets/',
    publishedAt: '2026-04-17T15:00:00.000Z',
  },
  {
    id: 'tr-5',
    region: 'Cape Town',
    title: 'Climate-tech fund doubles Africa allocation',
    subtitle: 'LP letter cites grid storage and agritech as priority themes for H2.',
    category: 'Investment',
    imageUrl:
      'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400&q=80',
    url: 'https://www.reuters.com/business/environment/',
    publishedAt: '2026-04-16T10:15:00.000Z',
  },
  {
    id: 'tr-6',
    region: 'San Francisco',
    title: 'Big Tech earnings: AI capex watch continues',
    subtitle: 'Global investors weigh hyperscaler spend against enterprise AI adoption curves.',
    category: 'Tech',
    imageUrl:
      'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=400&q=80',
    url: 'https://www.reuters.com/technology/',
    publishedAt: '2026-04-15T08:45:00.000Z',
  },
]
