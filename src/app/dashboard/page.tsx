import { Dashboard } from "@/components/dashboard";
import { TestingProvider, TestingBanner } from "@/hooks/useTestingMode";

export default function DashboardPage() {
  return (
    <TestingProvider>
      <TestingBanner />
      <Dashboard />
    </TestingProvider>
  );
}
