/**
 * 검토 대기 항목을 보여주는 팝업 컴포넌트
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { FileText, Clock, User, ExternalLink, Eye } from 'lucide-react';

interface PendingReview {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  health_age: number | null;
  health_tags: string[] | null;
  user_nickname?: string;
}

interface PendingReviewsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PendingReviewsDialog({
  open,
  onOpenChange,
}: PendingReviewsDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !user) return;

    const fetchPendingReviews = async () => {
      setLoading(true);

      // 담당 사용자 목록 가져오기
      const { data: assignedUsers } = await supabase
        .from('profiles')
        .select('id, nickname')
        .eq('assigned_coach_id', user.id);

      if (!assignedUsers || assignedUsers.length === 0) {
        setReviews([]);
        setLoading(false);
        return;
      }

      const userIds = assignedUsers.map(u => u.id);
      const nicknameMap = new Map(assignedUsers.map(u => [u.id, u.nickname]));

      // 검토 대기 건강검진 기록 가져오기
      const { data: pendingRecords } = await supabase
        .from('health_records')
        .select('id, user_id, status, created_at, health_age, health_tags')
        .in('user_id', userIds)
        .eq('status', 'pending_review')
        .order('created_at', { ascending: false });

      const reviewsWithNicknames = (pendingRecords || []).map(record => ({
        ...record,
        user_nickname: nicknameMap.get(record.user_id) || '사용자',
      }));

      setReviews(reviewsWithNicknames);
      setLoading(false);
    };

    fetchPendingReviews();
  }, [open, user]);

  const handleViewDetail = (review: PendingReview) => {
    onOpenChange(false);
    navigate(`/coach/user/${review.user_id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-600" />
            검토 대기 항목
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>검토 대기 중인 항목이 없습니다</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3 py-4 pr-4">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-muted/50 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{review.user_nickname}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {format(parseISO(review.created_at), 'M월 d일 HH:mm', { locale: ko })}
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700">
                      검토 대기
                    </Badge>
                  </div>

                  {/* 건강 태그가 있는 경우 */}
                  {review.health_tags && review.health_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {review.health_tags.slice(0, 3).map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {review.health_tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{review.health_tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => handleViewDetail(review)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      검토하기
                    </Button>
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
