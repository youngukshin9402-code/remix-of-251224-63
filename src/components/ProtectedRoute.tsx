import { Navigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedTypes?: Array<"user" | "guardian" | "coach" | "admin">;
}

export function ProtectedRoute({ children, allowedTypes }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-lg text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // 권한 체크
  if (allowedTypes && profile && !allowedTypes.includes(profile.user_type)) {
    const homeByRole =
      profile.user_type === "admin"
        ? "/admin"
        : profile.user_type === "coach"
          ? "/coach"
          : "/dashboard";

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-6 text-center">
          <p className="text-xl font-semibold text-foreground">접근 권한이 없어요</p>
          <p className="mt-2 text-muted-foreground">
            이 페이지는 현재 계정 유형에서 열 수 없습니다.
          </p>
          <Link
            to={homeByRole}
            className="mt-5 inline-flex items-center justify-center h-12 px-6 rounded-xl bg-primary text-primary-foreground font-semibold"
          >
            돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
