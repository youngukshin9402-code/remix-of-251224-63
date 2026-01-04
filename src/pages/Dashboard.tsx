import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDailyData } from "@/contexts/DailyDataContext";
import { useHealthAge } from "@/contexts/HealthAgeContext";
import { useNutritionSettings } from "@/hooks/useNutritionSettings";
import { useTodayMealRecords } from "@/hooks/useMealRecordsQuery";
import { useGoalAchievement } from "@/hooks/useGoalAchievement";
import { useGuardianConnection } from "@/hooks/useGuardianConnection";
import { Badge } from "@/components/ui/badge";
import {
  Flame,
  Droplets,
  Dumbbell,
  ChevronRight,
  Target,
  TrendingUp,
  Heart,
} from "lucide-react";
import { getTodayString } from "@/lib/localStorage";
import YanggaengCharacter from "@/components/dashboard/YanggaengCharacter";

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const {
    todayWater,
    waterGoal,
    refreshWater,
    refreshPoints,
  } = useDailyData();

  const { getGoals, loading: settingsLoading, refetch: refetchSettings } = useNutritionSettings();
  const {
    totals,
    records: todayMealRecords,
    loading: mealsLoading,
    refetch: refetchMeals,
  } = useTodayMealRecords();
  const { checkAndNotify } = useGoalAchievement();
  
  // DB 기반 전역 상태에서 건강나이 가져오기 (즉시 로딩)
  const { healthAgeData, loading: healthAgeLoading } = useHealthAge();

  const goals = getGoals();
  const todayCalories = totals.totalCalories;
  const calorieGoal = goals?.calorieGoal ?? 0;
  const goalsReady = goals !== null;
  const caloriesReady = goalsReady && (todayMealRecords.length > 0 || !mealsLoading);
  const caloriesMet = caloriesReady && calorieGoal > 0 && todayCalories >= calorieGoal;

  const today = getTodayString();

  // Refresh data on mount and focus
  useEffect(() => {
    refreshWater();
    refreshPoints();
    refetchMeals();
    refetchSettings();
  }, [refreshWater, refreshPoints, refetchMeals, refetchSettings]);

  useEffect(() => {
    const handleFocus = () => {
      refreshWater();
      refreshPoints();
      refetchMeals();
      refetchSettings();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshWater, refreshPoints, refetchMeals, refetchSettings]);

  // 목표 달성 체크 및 알림
  useEffect(() => {
    const caloriesMet = caloriesReady && calorieGoal > 0 && todayCalories >= calorieGoal;
    const waterMet = todayWater >= waterGoal;
    
    checkAndNotify(caloriesMet, waterMet, false);
  }, [caloriesReady, todayCalories, calorieGoal, todayWater, waterGoal, checkAndNotify]);

  if (!profile) return null;

  const isGuardian = profile?.user_type === "guardian";
  
  // 보호자가 연결된 피보호자가 있는지 확인
  const { connections } = useGuardianConnection();
  const hasConnectedWards = isGuardian && connections.filter(
    (c) => c.guardian_id && c.user_id !== c.guardian_id
  ).length > 0;

  // 건강나이 데이터 (DB 전역 상태에서 즉시 가져옴 - 재계산 없음)
  const hasHealthAge = healthAgeData !== null;
  const actualAge = healthAgeData?.actualAge;
  const healthAge = healthAgeData?.healthAge;

  // 영양갱 달성 개수 계산 (실시간 반영)
  const achievementCount = useMemo(() => {
    let count = 0;
    if (hasHealthAge) count++;           // 건강나이 등록됨
    if (caloriesMet) count++;            // 칼로리 목표 달성
    if (todayWater >= waterGoal) count++; // 물 목표 달성
    // 걸음수는 연동 준비중이므로 제외 (추후 추가 가능)
    return count;
  }, [hasHealthAge, caloriesMet, todayWater, waterGoal]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header - 모바일에서 간격 축소 */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">
            안녕하세요, {profile?.nickname || "회원"}님!
          </h1>
          <p className="text-sm text-muted-foreground">오늘도 건강한 하루 보내세요 🌟</p>
        </div>
      </div>

      {/* 영양갱 캐릭터 + 말풍선 */}
      <YanggaengCharacter achievementCount={achievementCount} />

      {/* Today's Summary KPIs */}
      <div className="flex-1 flex flex-col min-h-0">
        <h2 className="text-base font-semibold flex items-center gap-2 mb-2">
          <Target className="w-4 h-4 text-primary" />
          오늘 요약
        </h2>
        
        <div className="grid grid-cols-2 gap-2 flex-1">
          {/* Calories */}
          <Link to="/nutrition" className="block">
            <div className="bg-card rounded-xl border border-border p-2.5 h-full hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-1 gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-5 h-5 rounded-full bg-health-orange/10 flex items-center justify-center shrink-0">
                    <Flame className="w-3 h-3 text-health-orange" />
                  </div>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap truncate">섭취 칼로리</span>
                </div>
                {caloriesReady && caloriesMet && (
                  <Badge className="bg-health-green text-white text-[9px] px-1 py-0 shrink-0">
                    달성
                  </Badge>
                )}
              </div>
              <p className="text-base font-bold tabular-nums">
                {goalsReady && !mealsLoading ? `${todayCalories.toLocaleString()} kcal` : "…"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                목표 {goalsReady ? calorieGoal.toLocaleString() : "…"} kcal
              </p>
              <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-health-orange transition-all"
                  style={{
                    width: `${
                      goalsReady && calorieGoal > 0
                        ? Math.min((todayCalories / calorieGoal) * 100, 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </Link>

          {/* Water */}
          <Link to="/water" className="block">
            <div className="bg-card rounded-xl border border-border p-2.5 h-full hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-1 gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-5 h-5 rounded-full bg-health-blue/10 flex items-center justify-center shrink-0">
                    <Droplets className="w-3 h-3 text-health-blue" />
                  </div>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap truncate">물 섭취</span>
                </div>
                {todayWater >= waterGoal && (
                  <Badge className="bg-health-green text-white text-[9px] px-1 py-0 shrink-0">
                    달성
                  </Badge>
                )}
              </div>
              <p className="text-base font-bold">{todayWater.toLocaleString()}ml</p>
              <p className="text-[10px] text-muted-foreground">목표 {waterGoal.toLocaleString()}ml</p>
              <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-health-blue transition-all"
                  style={{ width: `${Math.min((todayWater / waterGoal) * 100, 100)}%` }}
                />
              </div>
            </div>
          </Link>

          {/* 걸음수 카드 */}
          <Link to="/exercise" className="block">
            <div className="bg-card rounded-xl border border-border p-2.5 h-full hover:shadow-md transition-shadow">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-5 h-5 rounded-full bg-health-green/10 flex items-center justify-center shrink-0">
                  <Dumbbell className="w-3 h-3 text-health-green" />
                </div>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap truncate">걸음수</span>
              </div>
              <p className="text-base font-bold">0 걸음</p>
              <p className="text-[10px] text-muted-foreground">연동 준비중</p>
              <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-health-green transition-all" style={{ width: '0%' }} />
              </div>
            </div>
          </Link>

          {/* 건강나이 카드 */}
          <div 
            className="bg-card rounded-xl border border-border p-2.5 h-full hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate('/medical')}
          >
            <div className="flex items-center justify-between mb-1 gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-5 h-5 rounded-full bg-health-purple/10 flex items-center justify-center shrink-0">
                  <Heart className="w-3 h-3 text-health-purple" />
                </div>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap truncate">건강나이</span>
              </div>
              {hasHealthAge && (
                <Badge className="bg-health-green text-white text-[9px] px-1 py-0 shrink-0">
                  달성
                </Badge>
              )}
            </div>
            <p className="text-base font-bold">
              {hasHealthAge ? `${actualAge}세 / ${healthAge}세` : "- / -"}
            </p>
            <p className="text-[10px] text-muted-foreground">실제나이 / 건강나이</p>
            <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-health-purple transition-all" 
                style={{ 
                  width: hasHealthAge ? '100%' : '0%' 
                }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Guardian Family Section - 보호자이고 연결된 피보호자가 있을 때만 표시 */}
      {hasConnectedWards && (
        <Link to="/guardian" className="block mt-2">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20 p-3 flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm text-primary">연결된 가족 현황</p>
                <p className="text-xs text-muted-foreground">건강 요약 보기</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-primary" />
          </div>
        </Link>
      )}
    </div>
  );
}
