import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Search, UserPlus, Calendar, RefreshCw, Clock, User, Video } from "lucide-react";
import { useCoachingAdmin } from "@/hooks/useAdminHooks";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

const STATUS_OPTIONS = [
  { value: 'scheduled', label: '예정', color: 'bg-blue-100 text-blue-700' },
  { value: 'in_progress', label: '진행중', color: 'bg-purple-100 text-purple-700' },
  { value: 'completed', label: '완료', color: 'bg-green-100 text-green-700' },
  { value: 'cancelled', label: '취소', color: 'bg-red-100 text-red-700' },
];

interface CoachingRecord {
  id: string;
  coach_id: string;
  user_id: string;
  session_date: string;
  session_time: string;
  notes: string | null;
  created_at: string;
  coach_nickname?: string;
  user_nickname?: string;
}

export default function AdminCoaching() {
  const navigate = useNavigate();
  const { sessions, coaches, loading, assignCoach, refetch } = useCoachingAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [selectedCoachId, setSelectedCoachId] = useState("");
  
  // 코칭 기록 상태
  const [coachingRecords, setCoachingRecords] = useState<CoachingRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [activeTab, setActiveTab] = useState<'sessions' | 'records'>('records');

  // 코칭 기록 가져오기
  const fetchCoachingRecords = async () => {
    setLoadingRecords(true);
    
    const { data: records } = await supabase
      .from('coaching_records')
      .select('*')
      .order('session_date', { ascending: false })
      .order('session_time', { ascending: false })
      .limit(100);

    if (records && records.length > 0) {
      // 코치 및 사용자 닉네임 가져오기
      const coachIds = [...new Set(records.map(r => r.coach_id))];
      const userIds = [...new Set(records.map(r => r.user_id))];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nickname')
        .in('id', [...coachIds, ...userIds]);

      const nicknameMap = new Map((profiles || []).map(p => [p.id, p.nickname]));

      const recordsWithNicknames = records.map(record => ({
        ...record,
        coach_nickname: nicknameMap.get(record.coach_id) || '코치',
        user_nickname: nicknameMap.get(record.user_id) || '사용자',
      }));

      setCoachingRecords(recordsWithNicknames);
    } else {
      setCoachingRecords([]);
    }
    
    setLoadingRecords(false);
  };

  useEffect(() => {
    fetchCoachingRecords();
  }, []);

  const getStatusBadge = (status: string) => {
    const found = STATUS_OPTIONS.find(s => s.value === status);
    return found ? (
      <Badge className={found.color}>{found.label}</Badge>
    ) : (
      <Badge variant="outline">{status}</Badge>
    );
  };

  const filteredSessions = sessions.filter(s => 
    s.user_nickname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.coach_nickname?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRecords = coachingRecords.filter(r =>
    r.user_nickname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.coach_nickname?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 날짜별 그룹핑
  const groupedRecords = filteredRecords.reduce((acc, record) => {
    const date = record.session_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(record);
    return acc;
  }, {} as Record<string, CoachingRecord[]>);

  const sortedDates = Object.keys(groupedRecords).sort((a, b) => b.localeCompare(a));

  const handleAssign = async () => {
    if (!selectedSession || !selectedCoachId) return;
    await assignCoach(selectedSession.id, selectedCoachId);
    setShowAssignDialog(false);
    setSelectedSession(null);
    setSelectedCoachId("");
  };

  if (loading && loadingRecords) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Skeleton className="h-16 w-full mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">코칭 관리</h1>
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => {
            refetch();
            fetchCoachingRecords();
          }}>
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="고객명 또는 코치명 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 max-w-md"
          />
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'sessions' | 'records')}>
          <TabsList className="mb-6">
            <TabsTrigger value="records" className="gap-2">
              <Video className="w-4 h-4" />
              코칭 기록
            </TabsTrigger>
            <TabsTrigger value="sessions" className="gap-2">
              <Calendar className="w-4 h-4" />
              예약 세션
            </TabsTrigger>
          </TabsList>

          <TabsContent value="records">
            <p className="text-sm text-muted-foreground mb-4">
              코치가 기록한 1:1 코칭 상담 내역 (총 {filteredRecords.length}건)
            </p>

            {loadingRecords ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Video className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>기록된 코칭 상담이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-6">
                {sortedDates.map(date => (
                  <div key={date}>
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4 text-primary" />
                      <h3 className="font-medium">
                        {format(new Date(date), 'yyyy년 M월 d일 (E)', { locale: ko })}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {groupedRecords[date].length}건
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {groupedRecords[date]
                        .sort((a, b) => b.session_time.localeCompare(a.session_time))
                        .map(record => (
                          <div 
                            key={record.id} 
                            className="bg-card rounded-xl border border-border p-4 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">{record.session_time.slice(0, 5)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <User className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{record.user_nickname}</p>
                                  <p className="text-xs text-muted-foreground">
                                    담당: {record.coach_nickname}
                                  </p>
                                </div>
                              </div>
                            </div>
                            {record.notes && (
                              <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                {record.notes}
                              </p>
                            )}
                          </div>
                        ))
                      }
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sessions">
            <p className="text-sm text-muted-foreground mb-4">총 {filteredSessions.length}건</p>

            <div className="space-y-4">
              {filteredSessions.map((session) => (
                <div key={session.id} className="bg-card rounded-2xl border border-border p-5">
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold">
                          {new Date(session.scheduled_at).toLocaleString('ko-KR')}
                        </span>
                        {getStatusBadge(session.status || 'scheduled')}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        고객: <span className="font-medium text-foreground">{session.user_nickname || '알 수 없음'}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        코치: <span className="font-medium text-foreground">{session.coach_nickname || '미배정'}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedSession(session);
                          setSelectedCoachId(session.coach_id || "");
                          setShowAssignDialog(true);
                        }}
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        코치 배정
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredSessions.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  코칭 세션이 없습니다
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>코치 배정</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              {selectedSession?.user_nickname}님의 코칭 세션에 코치를 배정합니다
            </p>
            <Select value={selectedCoachId} onValueChange={setSelectedCoachId}>
              <SelectTrigger>
                <SelectValue placeholder="코치 선택" />
              </SelectTrigger>
              <SelectContent>
                {coaches.map((coach) => (
                  <SelectItem key={coach.id} value={coach.id}>
                    {coach.nickname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              취소
            </Button>
            <Button onClick={handleAssign} disabled={!selectedCoachId}>
              배정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
