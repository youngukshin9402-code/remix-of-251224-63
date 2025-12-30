/**
 * 체크인 리포트 타임라인 컴포넌트
 * 사용자별/날짜별 리포트 목록 표시
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CheckinReportCard } from './CheckinReportCard';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, ClipboardCheck, Calendar, Users } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ko } from 'date-fns/locale';

interface CheckinReport {
  id: string;
  user_id: string;
  report_date: string;
  sent_at: string;
  version_number: number;
  summary: any;
  snapshot_data: any;
  user_nickname?: string;
}

interface CheckinReportTimelineProps {
  userId?: string; // 특정 사용자 필터
  limit?: number;
  showSearch?: boolean;
  showTabs?: boolean;
}

export function CheckinReportTimeline({ 
  userId, 
  limit = 50, 
  showSearch = true,
  showTabs = true 
}: CheckinReportTimelineProps) {
  const { user } = useAuth();
  const [reports, setReports] = useState<CheckinReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week'>('all');

  useEffect(() => {
    if (!user) return;

    const fetchReports = async () => {
      setLoading(true);
      
      let query = (supabase.from('checkin_reports') as any)
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(limit);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      // 날짜 필터
      if (dateFilter === 'today') {
        const today = new Date().toISOString().split('T')[0];
        query = query.eq('report_date', today);
      } else if (dateFilter === 'week') {
        const weekAgo = subDays(new Date(), 7).toISOString().split('T')[0];
        query = query.gte('report_date', weekAgo);
      }

      const { data, error } = await query;

      if (!error && data) {
        // 사용자 닉네임 매핑
        const userIds = [...new Set(data.map((r: any) => r.user_id))] as string[];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nickname')
          .in('id', userIds);

        const nicknameMap = new Map(profiles?.map(p => [p.id, p.nickname]) || []);
        
        const reportsWithNicknames = data.map((r: any) => ({
          ...r,
          user_nickname: nicknameMap.get(r.user_id) || '사용자',
        }));

        setReports(reportsWithNicknames);
      }
      
      setLoading(false);
    };

    fetchReports();
  }, [user, userId, dateFilter, limit]);

  // 검색 필터
  const filteredReports = reports.filter(report => 
    !searchQuery || 
    report.user_nickname?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 날짜별 그룹핑
  const groupedReports = filteredReports.reduce((acc, report) => {
    const date = report.report_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(report);
    return acc;
  }, {} as Record<string, CheckinReport[]>);

  const sortedDates = Object.keys(groupedReports).sort((a, b) => b.localeCompare(a));

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 검색 및 필터 */}
      {showSearch && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="사용자 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      )}

      {showTabs && (
        <Tabs value={dateFilter} onValueChange={(v) => setDateFilter(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="text-sm">
              전체
            </TabsTrigger>
            <TabsTrigger value="today" className="text-sm">
              오늘
            </TabsTrigger>
            <TabsTrigger value="week" className="text-sm">
              최근 7일
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* 리포트 목록 */}
      {filteredReports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">리포트가 없습니다</p>
            <p className="text-sm mt-1">
              {dateFilter === 'today' ? '오늘 받은 리포트가 없습니다.' : 
               dateFilter === 'week' ? '최근 7일간 받은 리포트가 없습니다.' :
               '아직 받은 리포트가 없습니다.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedDates.map(date => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-3 sticky top-0 bg-background py-2 z-10">
                <Calendar className="w-4 h-4 text-primary" />
                <h3 className="font-medium text-sm">
                  {format(new Date(date), 'yyyy년 M월 d일 (E)', { locale: ko })}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {groupedReports[date].length}건
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedReports[date]
                  .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())
                  .map(report => (
                    <CheckinReportCard 
                      key={report.id} 
                      report={report} 
                      compact={groupedReports[date].length > 1}
                    />
                  ))
                }
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
