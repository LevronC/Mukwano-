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
  emailVerified?: boolean
  country?: string | null
  residenceCountry?: string | null
  sector?: string | null
  avatarUrl?: string | null
  createdAt?: string
}

export type AuthResponse = {
  user: User
  accessToken: string
  refreshToken: string
}
