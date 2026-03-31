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
  country?: string | null
  sector?: string | null
}

export type AuthResponse = {
  user: User
  accessToken: string
  refreshToken: string
}
