/**
 * 목표 성취 알림 훅
 * - kcal 목표 + 물 목표 + 오늘 할 일(3개) 달성 시 알림
 * - achieved=false → true 순간에만 1회
 * - achieved=true → false → true 재달성 시 매번 1회
 * - 날짜별 독립 관리 (KST)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// KST 기준 오늘 날짜 문자열
const getKSTDateString = (): string => {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split('T')[0];
};

interface GoalAchievementState {
  achieved: boolean;
  notifiedAt: string | null;
}

export function useGoalAchievement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const today = getKSTDateString();
  
  const [achievementState, setAchievementState] = useState<GoalAchievementState>({
    achieved: false,
    notifiedAt: null,
  });
  
  // 초기 로딩 완료 여부 (로딩 전에는 알림 체크 금지)
  const [isLoaded, setIsLoaded] = useState(false);
  
  // 이번 세션에서 이미 알림을 표시했는지 (중복 방지)
  const hasNotifiedThisSessionRef = useRef(false);

  // 오늘의 달성 상태 조회
  const fetchAchievementState = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('daily_goal_achievements')
      .select('achieved, notified_at')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();

    if (error) {
      console.error('Error fetching achievement state:', error);
      setIsLoaded(true);
      return;
    }

    if (data) {
      setAchievementState({
        achieved: data.achieved,
        notifiedAt: data.notified_at,
      });
      // 이미 오늘 알림을 받았으면 세션 플래그도 true로
      if (data.notified_at) {
        hasNotifiedThisSessionRef.current = true;
      }
    } else {
      // 오늘 레코드 없으면 생성
      const { error: insertError } = await supabase
        .from('daily_goal_achievements')
        .insert({
          user_id: user.id,
          date: today,
          achieved: false,
        });
      
      if (insertError && !insertError.message.includes('duplicate')) {
        console.error('Error creating achievement record:', insertError);
      }
      
      setAchievementState({ achieved: false, notifiedAt: null });
    }
    
    setIsLoaded(true);
  }, [user, today]);

  // 목표 달성 체크 및 알림
  // 핵심: 오늘 이미 알림받았으면 (notifiedAt 존재) 절대 재알림 금지
  const checkAndNotify = useCallback(async (
    caloriesMet: boolean,
    waterMet: boolean,
    missionsMet: boolean
  ) => {
    if (!user || !isLoaded) return;

    const allGoalsMet = caloriesMet && waterMet && missionsMet;
    
    // 이미 오늘 알림을 받았으면 무조건 스킵
    if (achievementState.notifiedAt || hasNotifiedThisSessionRef.current) {
      // DB에 achieved 상태만 업데이트 (알림 X)
      if (allGoalsMet !== achievementState.achieved) {
        await supabase
          .from('daily_goal_achievements')
          .upsert({
            user_id: user.id,
            date: today,
            achieved: allGoalsMet,
            notified_at: achievementState.notifiedAt, // 기존 값 유지
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,date',
          });
        
        setAchievementState(prev => ({ ...prev, achieved: allGoalsMet }));
      }
      return;
    }

    // 목표 달성 시 최초 1회 알림
    if (allGoalsMet) {
      const nowIso = new Date().toISOString();
      
      const { error } = await supabase
        .from('daily_goal_achievements')
        .upsert({
          user_id: user.id,
          date: today,
          achieved: true,
          notified_at: nowIso,
          updated_at: nowIso,
        }, {
          onConflict: 'user_id,date',
        });

      if (error) {
        console.error('Error updating achievement:', error);
        return;
      }

      // 알림 표시
      toast({
        title: "🎉 오늘의 목표 달성!",
        description: "칼로리, 물, 미션 모두 완료했어요!",
      });

      hasNotifiedThisSessionRef.current = true;
      setAchievementState({
        achieved: true,
        notifiedAt: nowIso,
      });
    }
  }, [user, today, toast, achievementState, isLoaded]);

  // 초기 로드
  useEffect(() => {
    fetchAchievementState();
  }, [fetchAchievementState]);

  return {
    achieved: achievementState.achieved,
    notifiedAt: achievementState.notifiedAt,
    checkAndNotify,
    refetch: fetchAchievementState,
  };
}
