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
  
  // 이전 달성 상태 추적 (false→true 전환 감지용)
  const prevAchievedRef = useRef<boolean>(false);

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
      return;
    }

    if (data) {
      setAchievementState({
        achieved: data.achieved,
        notifiedAt: data.notified_at,
      });
      prevAchievedRef.current = data.achieved;
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
      prevAchievedRef.current = false;
    }
  }, [user, today]);

  // 목표 달성 체크 및 알림
  const checkAndNotify = useCallback(async (
    caloriesMet: boolean,
    waterMet: boolean,
    missionsMet: boolean
  ) => {
    if (!user) return;

    const allGoalsMet = caloriesMet && waterMet && missionsMet;
    const wasAchieved = prevAchievedRef.current;

    // 상태 변화 없으면 무시
    if (allGoalsMet === wasAchieved) return;

    // DB 업데이트
    const { error } = await supabase
      .from('daily_goal_achievements')
      .upsert({
        user_id: user.id,
        date: today,
        achieved: allGoalsMet,
        notified_at: allGoalsMet && !wasAchieved ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,date',
      });

    if (error) {
      console.error('Error updating achievement:', error);
      return;
    }

    // false → true 전환 시에만 알림
    if (allGoalsMet && !wasAchieved) {
      toast({
        title: "🎉 오늘의 목표 달성!",
        description: "칼로리, 물, 미션 모두 완료했어요!",
      });
    }

    prevAchievedRef.current = allGoalsMet;
    setAchievementState({
      achieved: allGoalsMet,
      notifiedAt: allGoalsMet && !wasAchieved ? new Date().toISOString() : achievementState.notifiedAt,
    });
  }, [user, today, toast, achievementState.notifiedAt]);

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
