import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Users, Link2, Shield, Eye, EyeOff, Loader2, Copy, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useGuardianConnection } from "@/hooks/useGuardianConnection";
import { toast } from "sonner";

export default function GuardianSettingsPage() {
  const { profile } = useAuth();
  const {
    connections,
    pendingCode,
    codeExpiresAt,
    isLoading,
    generateConnectionCode,
    connectWithCode,
    fetchConnections,
  } = useGuardianConnection();

  const [connectionCode, setConnectionCode] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [generating, setGenerating] = useState(false);

  const isGuardian = profile?.user_type === "guardian";

  // 연결된 가족 (내가 보호자인 경우) 또는 연결된 보호자 (내가 사용자인 경우)
  const connectedUsers = connections.filter(
    (c) => c.guardian_id && c.guardian_id !== c.user_id
  );

  const handleConnect = async () => {
    if (!connectionCode || connectionCode.length !== 6) {
      toast.error("6자리 연결 코드를 입력해주세요");
      return;
    }

    setConnecting(true);
    const success = await connectWithCode(connectionCode);
    setConnecting(false);
    
    if (success) {
      setConnectionCode("");
    }
  };

  const handleGenerateCode = async () => {
    setGenerating(true);
    await generateConnectionCode();
    setGenerating(false);
  };

  const copyCode = () => {
    if (pendingCode) {
      navigator.clipboard.writeText(pendingCode);
      toast.success("코드가 클립보드에 복사되었습니다");
    }
  };

  const formatExpiresAt = (date: Date | null) => {
    if (!date) return "";
    const hours = Math.floor((date.getTime() - Date.now()) / (1000 * 60 * 60));
    if (hours < 1) return "곧 만료됨";
    return `${hours}시간 후 만료`;
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
          // Guardian View - 코드 입력해서 가족과 연결
          <>
            <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold">연결된 가족</h2>
                  <p className="text-sm text-muted-foreground">
                    가족의 건강 정보를 확인할 수 있습니다
                  </p>
                </div>
              </div>

              {connectedUsers.length > 0 ? (
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
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    가족에게 받은 6자리 연결 코드를 입력하세요
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="연결 코드 6자리"
                      value={connectionCode}
                      onChange={(e) => setConnectionCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      maxLength={6}
                      className="text-center text-lg tracking-widest"
                    />
                    <Button onClick={handleConnect} disabled={connecting}>
                      {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : "연결"}
                    </Button>
                  </div>
                </div>
              )}

              {/* 추가 가족 연결 */}
              {connectedUsers.length > 0 && (
                <div className="pt-4 border-t border-border space-y-3">
                  <p className="text-sm text-muted-foreground">추가 가족 연결</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="연결 코드 6자리"
                      value={connectionCode}
                      onChange={(e) => setConnectionCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      maxLength={6}
                      className="text-center text-lg tracking-widest"
                    />
                    <Button onClick={handleConnect} disabled={connecting}>
                      {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : "연결"}
                    </Button>
                  </div>
                </div>
              )}
            </div>

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
          // User View - 코드 생성해서 보호자에게 전달
          <>
            <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Link2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold">보호자 연결</h2>
                  <p className="text-sm text-muted-foreground">
                    가족에게 코드를 전달하여 연결하세요
                  </p>
                </div>
              </div>

              {pendingCode ? (
                <div className="space-y-3">
                  <div className="bg-primary/5 rounded-xl p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-2">연결 코드</p>
                    <p className="text-3xl font-bold tracking-[0.3em] text-primary">
                      {pendingCode}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatExpiresAt(codeExpiresAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={copyCode}>
                      <Copy className="w-4 h-4 mr-2" />
                      코드 복사
                    </Button>
                    <Button variant="outline" onClick={handleGenerateCode} disabled={generating}>
                      {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button className="w-full" size="lg" onClick={handleGenerateCode} disabled={generating}>
                  {generating ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  연결 코드 생성
                </Button>
              )}

              <p className="text-xs text-muted-foreground text-center">
                코드는 24시간 동안 유효합니다
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
