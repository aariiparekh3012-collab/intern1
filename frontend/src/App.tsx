import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./features/auth/LoginPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { OnboardingWizard } from "./features/onboarding/OnboardingWizard";
import { ClientsListPage } from "./features/clients/ClientsListPage";
import { ClientDetailPage } from "./features/clients/ClientDetailPage";
import { ApplicationsPage } from "./features/applications/ApplicationsPage";
import { ComplianceReviewPage } from "./features/compliance/ComplianceReviewPage";
import { ApplicationReviewDetail } from "./features/compliance/ApplicationReviewDetail";
import { SecuritiesPage } from "./features/reference/SecuritiesPage";
import { StrategiesPage } from "./features/reference/StrategiesPage";
import { BrokersPage } from "./features/reference/BrokersPage";
import { FeeSchedulesPage } from "./features/reference/FeeSchedulesPage";
import { OrderBookPage } from "./features/trading/OrderBookPage";
import { TradeBlotterPage } from "./features/trading/TradeBlotterPage";
import { HoldingsPage } from "./features/portfolio/HoldingsPage";
import { InvestorPortal } from "./features/investor/InvestorPortal";
import { PerformancePage } from "./features/performance/PerformancePage";
import { ReportsPage } from "./features/reports/ReportsPage";
import { ActivityFeedPage } from "./features/notifications/ActivityFeedPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { NotFoundPage } from "./features/misc/NotFoundPage";

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/onboarding" element={<OnboardingWizard />} />
            <Route path="/applications" element={<ApplicationsPage />} />
            <Route path="/compliance/review" element={<ComplianceReviewPage />} />
            <Route path="/compliance/review/:applicationId" element={<ApplicationReviewDetail />} />
            <Route path="/clients" element={<ClientsListPage />} />
            <Route path="/clients/:id" element={<ClientDetailPage />} />
            <Route path="/securities" element={<SecuritiesPage />} />
            <Route path="/strategies" element={<StrategiesPage />} />
            <Route path="/brokers" element={<BrokersPage />} />
            <Route path="/fee-schedules" element={<FeeSchedulesPage />} />
            <Route path="/orders" element={<OrderBookPage />} />
            <Route path="/trades" element={<TradeBlotterPage />} />
            <Route path="/holdings" element={<HoldingsPage />} />
            <Route path="/performance" element={<PerformancePage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/activity" element={<ActivityFeedPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/my-portfolio" element={<InvestorPortal />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}
