import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, parseISO, differenceInYears } from "date-fns";
import { ko } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  User,
  Heart,
  Check,
  X,
  Loader2,
  Eye,
  Phone,
  Calendar,
  Ruler,
  Scale,
  Target,
  Activity,
  AlertCircle,
} from "lucide-react";
import { HealthRecordDetailSheet } from "@/components/health/HealthRecordDetailSheet";

interface UserProfile {
  id: string;
  nickname: string | null;
  phone: string | null;
  subscription_tier: string;
  current_points: number;
  created_at: string;
}

interface NutritionSettings {
  gender: string | null;
  age: number | null;
  height_cm: number | null;
  current_weight: number | null;
  goal_weight: number | null;
  activity_level: string | null;
  conditions: string[] | null;
}

interface HealthRecord {
  id: string;
  user_id: string;
  status: string;
  health_age: number | null;
  health_tags: string[] | null;
  parsed_data: any;
  created_at: string;
  coach_comment: string | null;
  raw_image_urls: string[];
}


export default function CoachUserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [nutritionSettings, setNutritionSettings] = useState<NutritionSettings | null>(null);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewing, setReviewing] = useState(false);


  // 건강검진 상세보기 Sheet
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [detailRecord, setDetailRecord] = useState<HealthRecord | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;

      setLoading(true);

      // 프로필
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profile) setUserProfile(profile);

      // 영양 설정 (추가 정보)
      const { data: nutrition } = await supabase
        .from("nutrition_settings")
        .select("gender, age, height_cm, current_weight, goal_weight, activity_level, conditions")
        .eq("user_id", userId)
        .single();

      if (nutrition) setNutritionSettings(nutrition);

      // 건강 기록
      const { data: records } = await supabase
        .from("health_records")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      setHealthRecords(records || []);

      setLoading(false);
    };

    fetchData();
  }, [userId]);

  const handleReview = async (status: "completed" | "rejected") => {
    if (!selectedRecord || !user) return;

    setReviewing(true);

    const { error } = await supabase
      .from("health_records")
      .update({
        status,
        coach_comment: reviewComment,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", selectedRecord.id);

    setReviewing(false);

    if (error) {
      toast({
        title: "검토 실패",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: status === "completed" ? "검토 완료" : "반려 완료",
    });

    setShowReviewDialog(false);
    setSelectedRecord(null);
    setReviewComment("");

    // 새로고침
    const { data } = await supabase
      .from("health_records")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    setHealthRecords(data || []);
  };


  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_review":
        return <Badge className="bg-amber-100 text-amber-700">검토 대기</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-700">완료</Badge>;
      case "rejected":
        return <Badge variant="destructive">반려</Badge>;
      case "analyzing":
        return <Badge className="bg-blue-100 text-blue-700">분석중</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getActivityLevelLabel = (level: string | null) => {
    switch (level) {
      case 'sedentary': return '비활동적';
      case 'light': return '가벼운 활동';
      case 'moderate': return '보통 활동';
      case 'active': return '활동적';
      case 'very_active': return '매우 활동적';
      default: return level || '-';
    }
  };

  const getGenderLabel = (gender: string | null) => {
    switch (gender) {
      case 'male': return '남성';
      case 'female': return '여성';
      default: return gender || '-';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-48 w-full mb-4" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>회원을 찾을 수 없습니다</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/coach")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{userProfile.nickname}님</h1>
            <p className="text-sm text-muted-foreground">회원 상세 정보</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-6">
        {/* 기본 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              기본 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="flex items-start gap-2">
              <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">연락처</p>
                <p className="font-medium">{userProfile.phone || "-"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">성별</p>
                <p className="font-medium">{getGenderLabel(nutritionSettings?.gender)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">만 나이</p>
                <p className="font-medium">
                  {nutritionSettings?.age ? `${nutritionSettings.age}세` : "-"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Ruler className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">키</p>
                <p className="font-medium">
                  {nutritionSettings?.height_cm ? `${nutritionSettings.height_cm}cm` : "-"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Scale className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">현재 체중</p>
                <p className="font-medium">
                  {nutritionSettings?.current_weight ? `${nutritionSettings.current_weight}kg` : "-"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Target className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">목표 체중</p>
                <p className="font-medium">
                  {nutritionSettings?.goal_weight ? `${nutritionSettings.goal_weight}kg` : "-"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Activity className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">활동수준</p>
                <p className="font-medium">
                  {getActivityLevelLabel(nutritionSettings?.activity_level)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">가입일</p>
                <p className="font-medium">
                  {format(parseISO(userProfile.created_at), "yyyy.MM.dd", {
                    locale: ko,
                  })}
                </p>
              </div>
            </div>
          </CardContent>
          
          {/* 지병/건강 상태 */}
          {nutritionSettings?.conditions && nutritionSettings.conditions.length > 0 && (
            <CardContent className="pt-0">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">지병/건강 상태</p>
                  <div className="flex flex-wrap gap-2">
                    {nutritionSettings.conditions.map((condition, i) => (
                      <Badge key={i} variant="outline">
                        {condition}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* 건강검진 기록 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              건강검진 기록
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthRecords.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                건강검진 기록이 없습니다
              </p>
            ) : (
              <div className="space-y-3">
                {healthRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {format(parseISO(record.created_at), "yyyy년 M월 d일", {
                          locale: ko,
                        })}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusBadge(record.status)}
                        {record.health_age && (
                          <span className="text-sm text-muted-foreground">
                            건강나이: {record.health_age}세
                          </span>
                        )}
                      </div>
                      {record.coach_comment && (
                        <p className="text-sm text-muted-foreground mt-1">
                          코멘트: {record.coach_comment}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDetailRecord(record);
                          setShowDetailSheet(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        상세보기
                      </Button>
                      {record.status === "pending_review" && (
                        <Button
                          onClick={() => {
                            setSelectedRecord(record);
                            setShowReviewDialog(true);
                          }}
                        >
                          검토하기
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </main>

      {/* 검토 Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>건강검진 검토</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">코치 코멘트</label>
            <Textarea
              placeholder="회원에게 전달할 코멘트를 작성하세요..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              className="mt-2"
              rows={4}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={() => handleReview("rejected")}
              disabled={reviewing}
            >
              <X className="mr-1 h-4 w-4" />
              반려
            </Button>
            <Button onClick={() => handleReview("completed")} disabled={reviewing}>
              {reviewing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-1 h-4 w-4" />
              )}
              승인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* 건강검진 상세보기 Sheet */}
      <HealthRecordDetailSheet
        record={detailRecord}
        open={showDetailSheet}
        onOpenChange={setShowDetailSheet}
        userNickname={userProfile.nickname || undefined}
      />
    </div>
  );
}
