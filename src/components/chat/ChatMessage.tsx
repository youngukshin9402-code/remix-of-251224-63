import { useState } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface ChatMessageProps {
  message: string;
  messageType?: string;
  imageUrl?: string | null;
  senderNickname: string;
  timestamp: string;
  isOwn: boolean;
  isRead?: boolean;
}

export function ChatMessage({ 
  message, 
  messageType = 'text',
  imageUrl,
  senderNickname, 
  timestamp, 
  isOwn, 
  isRead 
}: ChatMessageProps) {
  const [imageOpen, setImageOpen] = useState(false);
  const formattedTime = format(new Date(timestamp), 'a h:mm', { locale: ko });

  const isImage = messageType === 'image' && imageUrl;

  return (
    <>
      <div className={cn('flex w-full mb-3', isOwn ? 'justify-end' : 'justify-start')}>
        <div className={cn('flex flex-col max-w-[75%]', isOwn ? 'items-end' : 'items-start')}>
          {!isOwn && (
            <span className="text-xs text-muted-foreground mb-1 px-1">
              {senderNickname}
            </span>
          )}
          
          {isImage ? (
            <div 
              className={cn(
                'rounded-2xl overflow-hidden cursor-pointer',
                isOwn ? 'rounded-br-md' : 'rounded-bl-md'
              )}
              onClick={() => setImageOpen(true)}
            >
              <img 
                src={imageUrl} 
                alt="채팅 이미지" 
                className="max-w-full max-h-64 object-cover"
              />
            </div>
          ) : (
            <div
              className={cn(
                'px-4 py-2.5 rounded-2xl break-words whitespace-pre-wrap',
                isOwn
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-muted rounded-bl-md'
              )}
            >
              <p className="text-sm leading-relaxed">{message}</p>
            </div>
          )}
          
          <div className="flex items-center gap-1.5 mt-1 px-1">
            <span className="text-[10px] text-muted-foreground">{formattedTime}</span>
            {isOwn && (
              <span className={cn('text-[10px]', isRead ? 'text-primary' : 'text-muted-foreground')}>
                {isRead ? '읽음' : '전송됨'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 이미지 크게 보기 */}
      <Dialog open={imageOpen} onOpenChange={setImageOpen}>
        <DialogContent className="max-w-3xl p-0 bg-transparent border-none">
          {imageUrl && (
            <img 
              src={imageUrl} 
              alt="채팅 이미지" 
              className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}