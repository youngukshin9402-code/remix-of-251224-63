import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Users, Link2, Shield, Eye, Loader2, RefreshCw, Phone, Key, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useGuardianConnection } from "@/hooks/useGuardianConnection";
import { toast } from "sonner";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

export default function GuardianSettingsPage() {
  const { profile } = useAuth();
  const {
    connections,
    isLoading,
    pendingVerificationCode,
    verificationExpiresAt,
    generatePhoneVerificationCode,
    connectWithPhoneVerification,
    disconnectGuardian,
    fetchConnections,
  } = useGuardianConnection();

  // 사용자(피보호자) 상태: 휴대전화 입력 및 인증 코드 생성
  const [myPhone, setMyPhone] = useState("");
  const [generating, setGenerating] = useState(false);

  // 보호자 상태: 연결할 사용자의 휴대전화와 인증 코드
  const [targetPhone, setTargetPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [connecting, setConnecting] = useState(false);

  const isGuardian = profile?.user_type === "guardian";

  // 연결된 가족 (guardian_id가 있는 경우만)
  const connectedUsers = connections.filter(
    (c) => c.guardian_id && c.guardian_id !== c.user_id
  );

  const handleGenerateCode = async () => {
    if (!myPhone || myPhone.length < 10) {
      toast.error("올바른 휴대전화 번호를 입력해주세요");
      return;
    }

    setGenerating(true);
    await generatePhoneVerificationCode(myPhone);
    setGenerating(false);
  };

  const handleConnect = async () => {
    if (!targetPhone || targetPhone.length < 10) {
      toast.error("연결할 가족의 휴대전화 번호를 입력해주세요");
      return;
    }
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error("6자리 인증 코드를 입력해주세요");
      return;
    }

    setConnecting(true);
    const success = await connectWithPhoneVerification(targetPhone, verificationCode);
    setConnecting(false);

    if (success) {
      setTargetPhone("");
      setVerificationCode("");
    }
  };

  const formatExpiresAt = (date: Date | null) => {
    if (!date) return "";
    const minutes = Math.floor((date.getTime() - Date.now()) / (1000 * 60));
    if (minutes < 1) return "곧 만료됨";
    return `${minutes}분 후 만료`;
  };

  const formatPhoneNumber = (value: string) => {
    return value.replace(/\D/g, "").slice(0, 11);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/profile">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold">보호자 연결</h1>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={() => fetchConnections()}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : isGuardian ? (
          // Guardian View - 가족의 휴대전화 번호 + 인증 코드로 연결
          <>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                가족에게 받은 휴대전화 번호와 인증 코드를 입력하여 연결하세요.
              </AlertDescription>
            </Alert>

            <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold">가족 연결하기</h2>
                  <p className="text-sm text-muted-foreground">
                    가족의 건강 정보를 확인할 수 있습니다
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    가족 휴대전화 번호
                  </label>
                  <Input
                    type="tel"
                    placeholder="01012345678"
                    value={targetPhone}
                    onChange={(e) => setTargetPhone(formatPhoneNumber(e.target.value))}
                    maxLength={11}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    인증 코드 (6자리)
                  </label>
                  <Input
                    placeholder="인증 코드 6자리"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    className="text-center text-lg tracking-widest"
                  />
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleConnect} 
                  disabled={connecting || !targetPhone || !verificationCode}
                >
                  {connecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  연결하기
                </Button>
              </div>
            </div>

            {/* 연결된 가족 목록 */}
            {connectedUsers.length > 0 && (
              <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  연결된 가족
                </h3>
                <div className="space-y-3">
                  {connectedUsers.map((conn) => (
                    <div
                      key={conn.id}
                      className="bg-muted/50 rounded-xl p-4 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium">
                          {conn.user_nickname || "사용자"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {conn.connected_at
                            ? new Date(conn.connected_at).toLocaleDateString("ko-KR") + " 연결됨"
                            : "연결됨"}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => disconnectGuardian(conn.id)}
                      >
                        연결 해제
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {connectedUsers.length > 0 && (
              <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  열람 권한
                </h3>
                <p className="text-sm text-muted-foreground">
                  가족이 허용한 범위 내에서만 정보를 볼 수 있습니다
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Eye className="w-5 h-5 text-muted-foreground" />
                      <span>건강 데이터 열람</span>
                    </div>
                    <span className="text-health-green">허용됨</span>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          // User View - 휴대전화 인증 코드 생성
          <>
            <Alert>
              <Phone className="h-4 w-4" />
              <AlertDescription>
                보호자에게 휴대전화 번호와 인증 코드를 전달하여 연결하세요.
              </AlertDescription>
            </Alert>

            <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Link2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold">보호자 연결</h2>
                  <p className="text-sm text-muted-foreground">
                    휴대전화 인증으로 안전하게 연결하세요
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    내 휴대전화 번호
                  </label>
                  <Input
                    type="tel"
                    placeholder="01012345678"
                    value={myPhone}
                    onChange={(e) => setMyPhone(formatPhoneNumber(e.target.value))}
                    maxLength={11}
                  />
                </div>

                <Button 
                  className="w-full" 
                  size="lg" 
                  onClick={handleGenerateCode} 
                  disabled={generating || !myPhone}
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  인증 코드 생성
                </Button>
              </div>

              {pendingVerificationCode && (
                <div className="space-y-3 pt-4 border-t border-border">
                  <div className="bg-primary/5 rounded-xl p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-2">인증 코드</p>
                    <p className="text-3xl font-bold tracking-[0.3em] text-primary">
                      {pendingVerificationCode}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatExpiresAt(verificationExpiresAt)}
                    </p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3">
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      <strong>보호자에게 전달하세요:</strong><br />
                      1. 내 휴대전화 번호: {myPhone}<br />
                      2. 인증 코드: {pendingVerificationCode}
                    </p>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">
                인증 코드는 5분간 유효합니다
              </p>
            </div>

            {/* 연결된 보호자 목록 */}
            {connectedUsers.length > 0 && (
              <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  연결된 보호자
                </h3>
                <div className="space-y-3">
                  {connectedUsers.map((conn) => (
                    <div
                      key={conn.id}
                      className="bg-muted/50 rounded-xl p-4 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium">
                          {conn.guardian_nickname || "보호자"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {conn.connected_at
                            ? new Date(conn.connected_at).toLocaleDateString("ko-KR") + " 연결됨"
                            : "연결됨"}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => disconnectGuardian(conn.id)}
                      >
                        연결 해제
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                권한 안내
              </h3>
              <p className="text-sm text-muted-foreground">
                연결된 보호자는 아래 정보를 열람할 수 있습니다
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                  <div>
                    <p className="font-medium">건강 요약</p>
                    <p className="text-sm text-muted-foreground">물/식사/운동 달성률</p>
                  </div>
                  <Eye className="w-5 h-5 text-health-green" />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                  <div>
                    <p className="font-medium">상세 기록</p>
                    <p className="text-sm text-muted-foreground">건강검진, 체중 등</p>
                  </div>
                  <Eye className="w-5 h-5 text-health-green" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
