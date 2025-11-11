import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UtensilsCrossed, User, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/hooks/use-auth-store';
import { api } from '@/lib/api-client';
import { getDeviceInfo } from '@/lib/utils';
import type { Member, AuditLog } from '@shared/types';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Toaster, toast } from 'sonner';
export function LoginPage() {
  const navigate = useNavigate();
  const { memberId } = useParams();
  const { login, role: currentRole, member: currentMember } = useAuthStore();
  const { data: members, isLoading } = useQuery<Member[]>({
    queryKey: ['members'],
    queryFn: () => api('/api/members'),
  });
  const { mutate: createAuditLog } = useMutation({
    mutationFn: (log: Partial<AuditLog>) => api('/api/audit-logs', { method: 'POST', body: JSON.stringify(log) }),
    onError: (err) => console.error("Failed to create audit log:", err),
  });
  useEffect(() => {
    if (currentRole) {
      const destination = currentMember?.role === 'admin' ? '/admin/dashboard' : '/member/dashboard';
      navigate(destination);
    }
  }, [currentRole, currentMember, navigate]);
  useEffect(() => {
    if (memberId && members) {
      const memberToLogin = members.find(m => m.id === memberId);
      if (memberToLogin) {
        handleLogin(memberToLogin);
      }
    }
  }, [memberId, members]);
  const handleLogin = (member: Member) => {
    const role = member.role === 'admin' ? 'admin' : 'member';
    login(role, member);
    toast.success(`Logged in as ${member.name}`);
    createAuditLog({
      event: 'login',
      userId: member.id,
      userName: member.name,
      deviceInfo: getDeviceInfo(),
    });
    const destination = member.role === 'admin' ? '/admin/dashboard' : '/member/dashboard';
    navigate(destination);
  };
  const handleSuperAdminLogin = () => {
    login('admin'); // No member object for super_admin
    toast.success(`Logged in as Super Admin`);
    createAuditLog({
      event: 'login',
      userId: 'super_admin',
      userName: 'Super Admin',
      deviceInfo: getDeviceInfo(),
    });
    navigate('/admin/dashboard');
  };
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <Toaster richColors />
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center justify-center bg-blue-500 text-white rounded-full p-4 mb-4 shadow-lg">
          <UtensilsCrossed className="w-10 h-10" />
        </div>
        <h1 className="text-5xl font-bold text-gray-800">DineFlow</h1>
        <p className="text-muted-foreground mt-2">Effortless Mess Management</p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Select Your Role</CardTitle>
            <CardDescription className="text-center">Choose your access level to continue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleSuperAdminLogin}
              className="w-full h-14 text-lg bg-gray-800 hover:bg-gray-900 text-white transition-all duration-300 transform hover:scale-105"
            >
              <Shield className="mr-2 h-5 w-5" />
              Super Admin Login
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or login as a member</span>
              </div>
            </div>
            {isLoading ? (
              <p className="text-center text-muted-foreground">Loading members...</p>
            ) : (
              <div className="space-y-2">
                {members?.map((member) => (
                  <Button
                    key={member.id}
                    onClick={() => handleLogin(member)}
                    variant="outline"
                    className="w-full h-12 text-md transition-all duration-300 transform hover:scale-105 hover:bg-slate-100"
                  >
                    <User className="mr-2 h-5 w-5" />
                    {member.name}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
      <footer className="absolute bottom-4 text-center text-muted-foreground/80 text-sm">
        <p>Built with ���️ at Cloudflare</p>
      </footer>
    </div>
  );
}