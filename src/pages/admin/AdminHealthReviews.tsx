/**
 * 관리자 건강검진 HITL 검토 페이지
 * ai_health_reports + ai_health_reviews 관리
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  RefreshCw,
  Search,
  Eye,
  CheckCircle,
  Clock,
  Brain,
  User,
} from 'lucide-react';

interface AIHealthReport {
  id: string;
  user_id: string;
  source_type: string;
  source_record_id: string | null;
  status: string;
  ai_result: any;
  input_snapshot: any;
  created_at: string;
  user_nickname?: string;
}

interface ReviewForm {
  review_note: string;
  overrides: string; // JSON string
}

export default function AdminHealthReviews() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [reports, setReports] = useState<AIHealthReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'published'>('all');
  
  const [selectedReport, setSelectedReport] = useState<AIHealthReport | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState<ReviewForm>({
    review_note: '',
    overrides: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    
    try {
      // 건강검진 관련 리포트만 조회
      const { data, error } = await supabase
        .from('ai_health_reports')
        .select('*')
        .eq('source_type', 'health_checkup')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 사용자 닉네임 조회
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(r => r.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nickname')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.nickname]));
        
        const reportsWithNickname = data.map(r => ({
          ...r,
          user_nickname: profileMap.get(r.user_id) || '사용자',
        }));

        setReports(reportsWithNickname);
      } else {
        setReports([]);
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
      toast({ title: '데이터 로드 실패', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchReports();
    }
  }, [isAdmin]);

  const handleViewReport = async (report: AIHealthReport) => {
    setSelectedReport(report);
    
    // 기존 검토 내용 로드
    const { data: existingReview } = await supabase
      .from('ai_health_reviews')
      .select('*')
      .eq('report_id', report.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingReview) {
      setReviewForm({
        review_note: existingReview.review_note || '',
        overrides: existingReview.overrides ? JSON.stringify(existingReview.overrides, null, 2) : '',
      });
    } else {
      setReviewForm({ review_note: '', overrides: '' });
    }
    
    setDialogOpen(true);
  };

  const handlePublishReview = async () => {
    if (!selectedReport || !user) return;
    
    setSaving(true);
    
    try {
      // overrides 파싱
      let parsedOverrides = null;
      if (reviewForm.overrides.trim()) {
        try {
          parsedOverrides = JSON.parse(reviewForm.overrides);
        } catch {
          toast({ title: 'overrides JSON 형식 오류', variant: 'destructive' });
          setSaving(false);
          return;
        }
      }

      // 기존 검토 삭제 후 새로 생성 (또는 upsert)
      const { error } = await supabase
        .from('ai_health_reviews')
        .upsert({
          report_id: selectedReport.id,
          admin_id: user.id,
          review_note: reviewForm.review_note || null,
          overrides: parsedOverrides,
          review_status: 'published',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'report_id',
        });

      if (error) throw error;

      toast({ title: '검토 완료 및 공개됨' });
      setDialogOpen(false);
      fetchReports();
    } catch (err) {
      console.error('Error publishing review:', err);
      toast({ title: '저장 실패', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // 필터링
  const filteredReports = reports.filter(report => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!report.user_nickname?.toLowerCase().includes(query)) {
        return false;
      }
    }
    return true;
  });

  if (!isAdmin) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">접근 권한이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/admin">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <h1 className="text-xl font-bold">건강검진 AI 검토</h1>
          </div>
          <Button variant="outline" size="sm" onClick={fetchReports}>
            <RefreshCw className="w-4 h-4 mr-1" />
            새로고침
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 검색 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="사용자 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{reports.length}</p>
              <p className="text-xs text-muted-foreground">전체</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {reports.filter(r => r.status === 'pending').length}
              </p>
              <p className="text-xs text-muted-foreground">검토 대기</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-health-green">
                {reports.filter(r => r.status === 'completed').length}
              </p>
              <p className="text-xs text-muted-foreground">완료</p>
            </CardContent>
          </Card>
        </div>

        {/* 리포트 목록 */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-12">
            <Brain className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground">검토할 건강검진 리포트가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReports.map((report) => (
              <Card key={report.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewReport(report)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{report.user_nickname}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(report.created_at).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={report.status === 'completed' ? 'default' : 'secondary'}>
                        {report.status === 'completed' ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            분석완료
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 mr-1" />
                            대기중
                          </>
                        )}
                      </Badge>
                      <Button variant="ghost" size="icon">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 검토 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>건강검진 AI 검토</DialogTitle>
          </DialogHeader>
          
          {selectedReport && (
            <div className="space-y-4">
              {/* 사용자 정보 */}
              <div className="bg-muted rounded-xl p-3">
                <p className="text-sm font-medium">사용자: {selectedReport.user_nickname}</p>
                <p className="text-xs text-muted-foreground">
                  분석일: {new Date(selectedReport.created_at).toLocaleString('ko-KR')}
                </p>
              </div>

              {/* AI 분석 결과 */}
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  AI 분석 결과
                </h4>
                <pre className="bg-muted rounded-xl p-3 text-xs overflow-auto max-h-40">
                  {JSON.stringify(selectedReport.ai_result, null, 2)}
                </pre>
              </div>

              {/* 검토 노트 */}
              <div>
                <label className="text-sm font-medium">검토 코멘트</label>
                <Textarea
                  value={reviewForm.review_note}
                  onChange={(e) => setReviewForm({ ...reviewForm, review_note: e.target.value })}
                  placeholder="사용자에게 표시될 전문가 코멘트..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              {/* Overrides (선택) */}
              <div>
                <label className="text-sm font-medium">Overrides (JSON, 선택)</label>
                <Textarea
                  value={reviewForm.overrides}
                  onChange={(e) => setReviewForm({ ...reviewForm, overrides: e.target.value })}
                  placeholder='{"summary": "수정된 요약", "health_score": 85}'
                  rows={4}
                  className="mt-1 font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  AI 결과를 덮어쓸 필드만 입력하세요
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={handlePublishReview} disabled={saving}>
              {saving ? '저장 중...' : '검토 완료 및 공개'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
