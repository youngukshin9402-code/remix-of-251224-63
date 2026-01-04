import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CoachNotificationSettings {
  id?: string;
  coach_id: string;
  health_checkup_upload: boolean;
  inbody_upload: boolean;
  chat_message: boolean;
}

export function useCoachNotificationSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<CoachNotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('coach_notification_settings')
        .select('*')
        .eq('coach_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching notification settings:', error);
      }

      if (data) {
        setSettings(data);
      } else {
        // 기본 설정 생성
        const defaultSettings: CoachNotificationSettings = {
          coach_id: user.id,
          health_checkup_upload: true,
          inbody_upload: true,
          chat_message: true,
        };
        setSettings(defaultSettings);
      }
    } catch (err) {
      console.error('Error fetching notification settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<CoachNotificationSettings>) => {
    if (!user) return false;

    try {
      const { data: existing } = await supabase
        .from('coach_notification_settings')
        .select('id')
        .eq('coach_id', user.id)
        .single();

      if (existing) {
        // 업데이트
        const { error } = await supabase
          .from('coach_notification_settings')
          .update(newSettings)
          .eq('coach_id', user.id);

        if (error) throw error;
      } else {
        // 신규 생성
        const { error } = await supabase
          .from('coach_notification_settings')
          .insert({ 
            coach_id: user.id,
            ...newSettings 
          });

        if (error) throw error;
      }

      setSettings(prev => prev ? { ...prev, ...newSettings } : null);
      return true;
    } catch (err) {
      console.error('Error updating notification settings:', err);
      return false;
    }
  };

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  return {
    settings,
    loading,
    updateSettings,
    refetch: fetchSettings,
  };
}
