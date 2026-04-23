export type ApiError = {
  error: {
    code: string
    message: string
    field: string | null
    status: number
  }
}

export type User = {
  id: string
  email: string
  displayName: string
  isGlobalAdmin: boolean
  /** USER | GLOBAL_ADMIN — circle CREATOR/ADMIN live on memberships. */
  platformRole?: string
  emailVerified?: boolean
  country?: string | null
  residenceCountry?: string | null
  /** U.S. state / D.C. when `residenceCountry` is United States. */
  residenceRegion?: string | null
  sector?: string | null
  avatarUrl?: string | null
  createdAt?: string
}

export type AuthResponse = {
  user: User
  accessToken: string
  refreshToken: string
}
