import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * FirstLogin is no longer used.
 * Users now set their password via the welcome email link (/reset-password/:token)
 * that is sent automatically when their account is created by an admin.
 * This component simply redirects logged-in users to their dashboard.
 */
export default function FirstLogin() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const roleRoutes: Record<string, string> = { ADMIN: '/admin' };
    navigate(roleRoutes[user?.role ?? ''] || '/employee', { replace: true });
  }, [user, navigate]);

  return null;
}
