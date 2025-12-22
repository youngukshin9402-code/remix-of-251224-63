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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import { HealthRecordDetailSheet } from '@/components/health/HealthRecordDetailSheet';

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
  raw_image_urls?: string[];
}

export default function AdminHealthReviews() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [reports, setReports] = useState<AIHealthReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedReport, setSelectedReport] = useState<AIHealthReport | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

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

      // 사용자 닉네임 및 health_records의 raw_image_urls 조회
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(r => r.user_id))];
        const sourceRecordIds = data.filter(r => r.source_record_id).map(r => r.source_record_id);
        
        const [profilesRes, recordsRes] = await Promise.all([
          supabase.from('profiles').select('id, nickname').in('id', userIds),
          sourceRecordIds.length > 0 
            ? supabase.from('health_records').select('id, raw_image_urls, parsed_data, user_id, status, health_age, health_tags, coach_comment, created_at').in('id', sourceRecordIds)
            : Promise.resolve({ data: [] })
        ]);

        const profileMap = new Map<string, string | null>(profilesRes.data?.map(p => [p.id, p.nickname]) || []);
        const recordsMap = new Map<string, any>();
        recordsRes.data?.forEach(r => recordsMap.set(r.id, r));
        
        const reportsWithData = data.map(r => {
          const healthRecord = r.source_record_id ? recordsMap.get(r.source_record_id) : null;
          return {
            ...r,
            user_nickname: profileMap.get(r.user_id) || '사용자',
            raw_image_urls: healthRecord?.raw_image_urls || [],
            health_record: healthRecord, // 전체 health_record 전달
          };
        });

        setReports(reportsWithData);
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

  const handleViewReport = (report: AIHealthReport) => {
    setSelectedReport(report);
    setDetailSheetOpen(true);
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

      {/* 상세보기 Sheet */}
      {selectedReport && (
        <HealthRecordDetailSheet
          open={detailSheetOpen}
          onOpenChange={setDetailSheetOpen}
          record={selectedReport.source_record_id ? {
            id: selectedReport.source_record_id,
            user_id: selectedReport.user_id,
            raw_image_urls: selectedReport.raw_image_urls || [],
            status: selectedReport.status,
            created_at: selectedReport.created_at,
          } : null}
          userNickname={selectedReport.user_nickname}
        />
      )}
    </div>
  );
}
