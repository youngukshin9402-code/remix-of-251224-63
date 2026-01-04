import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useCoachNotificationSettings } from './useCoachNotificationSettings';

// 브라우저 알림 권한 요청
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

// 브라우저 알림 표시
const showBrowserNotification = (title: string, body: string) => {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: 'coach-notification',
    });

    // 5초 후 자동으로 닫기
    setTimeout(() => {
      notification.close();
    }, 5000);
  }
};

export function useCoachNotifications() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { settings } = useCoachNotificationSettings();
  const nicknameCache = useRef<Map<string, string>>(new Map());

  // 사용자 닉네임 조회
  const getUserNickname = useCallback(async (userId: string): Promise<string> => {
    if (nicknameCache.current.has(userId)) {
      return nicknameCache.current.get(userId)!;
    }

    try {
      const { data } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', userId)
        .single();

      const nickname = data?.nickname || '사용자';
      nicknameCache.current.set(userId, nickname);
      return nickname;
    } catch {
      return '사용자';
    }
  }, []);

  // 알림 표시 함수
  const showNotification = useCallback((title: string, message: string) => {
    // 앱 내 토스트 알림 (5초 후 사라짐)
    toast({
      title,
      description: message,
      duration: 5000,
    });

    // 브라우저 알림
    showBrowserNotification(title, message);
  }, [toast]);

  useEffect(() => {
    if (!user || profile?.user_type !== 'coach') return;

    // 브라우저 알림 권한 요청
    requestNotificationPermission();

    // 건강검진 업로드 구독
    const healthRecordChannel = supabase
      .channel('coach-health-records')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'health_records',
        },
        async (payload) => {
          if (!settings?.health_checkup_upload) return;

          const record = payload.new as any;
          
          // 해당 사용자가 현재 코치에게 배정되어 있는지 확인
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('assigned_coach_id, nickname')
            .eq('id', record.user_id)
            .single();

          if (userProfile?.assigned_coach_id === user.id) {
            const nickname = userProfile.nickname || '사용자';
            showNotification(
              '건강검진 업로드',
              `${nickname}님이 건강검진 사진을 업로드 했습니다`
            );
          }
        }
      )
      .subscribe();

    // 인바디/건강나이 업로드 구독
    const inbodyChannel = supabase
      .channel('coach-inbody-records')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inbody_records',
        },
        async (payload) => {
          if (!settings?.inbody_upload) return;

          const record = payload.new as any;
          
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('assigned_coach_id, nickname')
            .eq('id', record.user_id)
            .single();

          if (userProfile?.assigned_coach_id === user.id) {
            const nickname = userProfile.nickname || '사용자';
            showNotification(
              '인바디 업로드',
              `${nickname}님이 인바디 및 건강나이 사진을 업로드 했습니다`
            );
          }
        }
      )
      .subscribe();

    // 채팅 메시지 구독
    const chatChannel = supabase
      .channel('coach-chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          if (!settings?.chat_message) return;

          const message = payload.new as any;
          
          // 보낸 사람 닉네임 조회
          const nickname = await getUserNickname(message.sender_id);
          
          showNotification(
            '새 채팅',
            `${nickname}님이 채팅이 왔습니다`
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(healthRecordChannel);
      supabase.removeChannel(inbodyChannel);
      supabase.removeChannel(chatChannel);
    };
  }, [user, profile, settings, showNotification, getUserNickname]);
}
