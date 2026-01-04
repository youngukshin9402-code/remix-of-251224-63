/**
 * 특정 사용자의 활동 카드를 날짜별로 보여주는 다이얼로그
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { CheckinReportCard } from './CheckinReportCard';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { User, Calendar, ClipboardCheck } from 'lucide-react';

interface UserActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userNickname: string;
}

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

export function UserActivityDialog({
  open,
  onOpenChange,
  userId,
  userNickname,
}: UserActivityDialogProps) {
  const [reports, setReports] = useState<CheckinReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !userId) return;

    const fetchReports = async () => {
      setLoading(true);

      const { data } = await supabase
        .from('checkin_reports')
        .select('*')
        .eq('user_id', userId)
        .order('report_date', { ascending: false })
        .order('sent_at', { ascending: false })
        .limit(100);

      const reportsWithNickname = (data || []).map(r => ({
        ...r,
        user_nickname: userNickname,
      }));

      setReports(reportsWithNickname);
      setLoading(false);
    };

    fetchReports();
  }, [open, userId, userNickname]);

  // 날짜별 그룹핑
  const groupedByDate = reports.reduce((acc, report) => {
    const date = report.report_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(report);
    return acc;
  }, {} as Record<string, CheckinReport[]>);

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            {userNickname}님의 활동 카드
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 py-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <ClipboardCheck className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>{userNickname}님의 활동 카드가 없습니다</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[65vh]">
            <div className="space-y-6 py-4 pr-4">
              {sortedDates.map(date => (
                <div key={date}>
                  <div className="flex items-center gap-2 mb-3 sticky top-0 bg-background py-2 z-10">
                    <Calendar className="w-4 h-4 text-primary" />
                    <h3 className="font-medium text-sm">
                      {format(new Date(date), 'yyyy년 M월 d일 (E)', { locale: ko })}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {groupedByDate[date].length}건
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {groupedByDate[date]
                      .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())
                      .map(report => (
                        <CheckinReportCard
                          key={report.id}
                          report={report}
                          compact={false}
                        />
                      ))
                    }
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
