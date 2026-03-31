import { Outlet } from 'react-router-dom'
import { AppThemeShell } from '@/components/theme/AppThemeShell'

export function RootLayout() {
  return (
    <AppThemeShell>
      <Outlet />
    </AppThemeShell>
  )
}
