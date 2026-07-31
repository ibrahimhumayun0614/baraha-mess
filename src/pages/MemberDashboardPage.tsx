import { useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useMemberDashboard } from '@/hooks/use-mess-queries';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import MemberDashboard from '@/components/dashboard/MemberDashboard';
import { Skeleton } from '@/components/ui/skeleton';

export function MemberDashboardPage() {
  const navigate = useNavigate();
  const { member: currentUser, logout } = useAuthStore();
  const { data, isLoading, error } = useMemberDashboard(currentUser?.id ?? '');

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  if (!currentUser) {
    navigate('/');
    return null;
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8 md:py-10 lg:py-12 space-y-8">
            <Skeleton className="h-24 w-full" />
            <div className="grid gap-6 md:grid-cols-3">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      );
    }
    if (error) {
      return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8 md:py-10 lg:py-12 text-center">
            <p className="text-red-500">Failed to load dashboard data: {error.message}</p>
          </div>
        </div>
      );
    }
    if (data) {
      return (
        <MemberDashboard
          members={data.members}
          currentUser={currentUser}
          expenses={data.expenses}
          stats={data.stats}
        />
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster richColors />
      <DashboardHeader user={currentUser} onLogout={handleLogout} />
      {renderContent()}
    </div>
  );
}
