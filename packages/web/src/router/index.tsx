import { Navigate, Outlet, createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { RootLayout } from '@/components/theme/RootLayout'
import { useAuth } from '@/contexts/AuthContext'
import { LoginPage } from '@/pages/auth/LoginPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage'
import { VerifyEmailRequiredPage } from '@/pages/auth/VerifyEmailRequiredPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { SplashPage } from '@/pages/SplashPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { CirclesListPage } from '@/pages/circles/CirclesListPage'
import { NewCirclePage } from '@/pages/circles/NewCirclePage'
import { CircleDetailPage } from '@/pages/circles/CircleDetailPage'
import { NewContributionPage } from '@/pages/contributions/NewContributionPage'
import { NewProposalPage } from '@/pages/proposals/NewProposalPage'
import { ProposalDetailPage } from '@/pages/proposals/ProposalDetailPage'
import { ProjectDetailPage } from '@/pages/projects/ProjectDetailPage'
import { PortfolioPage } from '@/pages/PortfolioPage'
import { ExplorePage } from '@/pages/ExplorePage'
import { AdminPage } from '@/pages/admin/AdminPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { OnboardingSectorPage } from '@/pages/onboarding/OnboardingSectorPage'
import { OnboardingCountryPage } from '@/pages/onboarding/OnboardingCountryPage'
import { OnboardingCompletePage } from '@/pages/onboarding/OnboardingCompletePage'
import { TermsPage } from '@/pages/legal/TermsPage'
import { PrivacyPage } from '@/pages/legal/PrivacyPage'

function ProtectedLayout() {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-4 text-[var(--mk-muted)]">Loading...</div>
  if (!user) return <Navigate replace to="/login" />
  return <AppLayout />
}

function VerifiedLayout() {
  const { user } = useAuth()
  // Phone verification can be added to this gate when OTP flows are implemented.
  if (!user?.emailVerified) return <Navigate replace to="/verify-email-required" />
  return <Outlet />
}

function OnboardingRequiredLayout() {
  const { user } = useAuth()
  if (!user?.sector || !user?.residenceCountry) return <Navigate replace to="/onboarding/sector" />
  return <Outlet />
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { index: true, element: <SplashPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'signup', element: <SignupPage /> },
      { path: 'verify-email', element: <VerifyEmailPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: 'explore', element: <ExplorePage /> },
      { path: 'terms', element: <TermsPage /> },
      { path: 'privacy', element: <PrivacyPage /> },
      {
        element: <ProtectedLayout />,
        children: [
          { path: 'verify-email-required', element: <VerifyEmailRequiredPage /> },
          {
            element: <VerifiedLayout />,
            children: [
              { path: 'onboarding/sector', element: <OnboardingSectorPage /> },
              { path: 'onboarding/country', element: <OnboardingCountryPage /> },
              { path: 'onboarding/complete', element: <OnboardingCompletePage /> },
              {
                element: <OnboardingRequiredLayout />,
                children: [
                  { path: 'dashboard', element: <DashboardPage /> },
                  { path: 'circles', element: <CirclesListPage /> },
                  { path: 'circles/new', element: <NewCirclePage /> },
                  { path: 'circles/:id', element: <CircleDetailPage /> },
                  { path: 'circles/:id/contributions/new', element: <NewContributionPage /> },
                  { path: 'circles/:id/proposals/new', element: <NewProposalPage /> },
                  { path: 'circles/:id/proposals/:pid', element: <ProposalDetailPage /> },
                  { path: 'circles/:id/projects/:projId', element: <ProjectDetailPage /> },
                  { path: 'portfolio', element: <PortfolioPage /> },
                  { path: 'admin', element: <AdminPage /> },
                  { path: 'profile', element: <ProfilePage /> }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
])
