import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Bell, FileText, Activity, MessageSquare } from 'lucide-react';
import { useCoachNotificationSettings } from '@/hooks/useCoachNotificationSettings';
import { requestNotificationPermission } from '@/hooks/useCoachNotifications';
import { useToast } from '@/hooks/use-toast';

interface CoachNotificationSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CoachNotificationSettingsDialog({
  open,
  onOpenChange,
}: CoachNotificationSettingsDialogProps) {
  const { toast } = useToast();
  const { settings, loading, updateSettings } = useCoachNotificationSettings();
  
  const [healthCheckupUpload, setHealthCheckupUpload] = useState(true);
  const [inbodyUpload, setInbodyUpload] = useState(true);
  const [chatMessage, setChatMessage] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setHealthCheckupUpload(settings.health_checkup_upload);
      setInbodyUpload(settings.inbody_upload);
      setChatMessage(settings.chat_message);
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    
    const success = await updateSettings({
      health_checkup_upload: healthCheckupUpload,
      inbody_upload: inbodyUpload,
      chat_message: chatMessage,
    });

    setSaving(false);

    if (success) {
      toast({
        title: '알림 설정 저장',
        description: '알림 설정이 저장되었습니다.',
      });
      onOpenChange(false);
    } else {
      toast({
        title: '저장 실패',
        description: '알림 설정을 저장하지 못했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      toast({
        title: '알림 권한 허용',
        description: '브라우저 알림이 활성화되었습니다.',
      });
    } else {
      toast({
        title: '알림 권한 거부',
        description: '브라우저 설정에서 알림을 허용해주세요.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            알림 설정
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* 브라우저 알림 권한 */}
            {'Notification' in window && Notification.permission !== 'granted' && (
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-3">
                  앱 외부에서도 알림을 받으려면 브라우저 알림을 허용해주세요.
                </p>
                <Button variant="outline" size="sm" onClick={handleRequestPermission}>
                  브라우저 알림 허용
                </Button>
              </div>
            )}

            {/* 건강검진 업로드 알림 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <Label htmlFor="health-checkup" className="font-medium">
                    건강검진 사진 업로드
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    회원이 건강검진 사진을 업로드하면 알림
                  </p>
                </div>
              </div>
              <Switch
                id="health-checkup"
                checked={healthCheckupUpload}
                onCheckedChange={setHealthCheckupUpload}
              />
            </div>

            {/* 인바디/건강나이 업로드 알림 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <Label htmlFor="inbody" className="font-medium">
                    인바디/건강나이 업로드
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    회원이 인바디 사진을 업로드하면 알림
                  </p>
                </div>
              </div>
              <Switch
                id="inbody"
                checked={inbodyUpload}
                onCheckedChange={setInbodyUpload}
              />
            </div>

            {/* 채팅 메시지 알림 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <Label htmlFor="chat" className="font-medium">
                    채팅 메시지
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    회원이 채팅을 보내면 알림 (내용은 미표시)
                  </p>
                </div>
              </div>
              <Switch
                id="chat"
                checked={chatMessage}
                onCheckedChange={setChatMessage}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                취소
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                저장
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
