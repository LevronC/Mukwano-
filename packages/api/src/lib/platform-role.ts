/** Stored on `User.platformRole`. Circle-scoped CREATOR / ADMIN use `CircleMembership.role`. */
export const USER_PLATFORM_ROLES = ['USER', 'GLOBAL_ADMIN'] as const
export type UserPlatformRole = (typeof USER_PLATFORM_ROLES)[number]

export function isGlobalPlatformAdmin(user: {
  isGlobalAdmin?: boolean | null
  platformRole?: string | null
} | null | undefined): boolean {
  if (!user) return false
  if (user.platformRole === 'GLOBAL_ADMIN') return true
  return user.isGlobalAdmin === true
}

export function toPersistedGlobalAdminFlags(wantGlobalAdmin: boolean): {
  isGlobalAdmin: boolean
  platformRole: UserPlatformRole
} {
  return {
    isGlobalAdmin: wantGlobalAdmin,
    platformRole: wantGlobalAdmin ? 'GLOBAL_ADMIN' : 'USER'
  }
}
