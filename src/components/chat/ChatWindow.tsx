import { useState, useRef, useEffect } from 'react';
import { Send, Smile, Image as ImageIcon, Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatMessage } from './ChatMessage';
import { useAuth } from '@/contexts/AuthContext';
import type { ChatMessage as ChatMessageType } from '@/hooks/useChat';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// 기본 이모지 목록
const EMOJI_LIST = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
  '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗',
  '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭',
  '🤔', '🤐', '😐', '😑', '😶', '😏', '😒', '🙄',
  '👍', '👎', '👏', '🙏', '💪', '❤️', '🔥', '✨',
  '🎉', '🎊', '💯', '👌', '✅', '🆗', '💬', '📸',
];

interface ChatWindowProps {
  messages: ChatMessageType[];
  loading: boolean;
  sending: boolean;
  onSendMessage: (message: string) => Promise<boolean>;
  onSendImage?: (file: File) => Promise<boolean>;
  partnerName: string;
  readOnly?: boolean;
}

export function ChatWindow({ 
  messages, 
  loading, 
  sending, 
  onSendMessage, 
  onSendImage,
  partnerName,
  readOnly = false
}: ChatWindowProps) {
  const { user } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const [previewImage, setPreviewImage] = useState<{ file: File; url: string } | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending || readOnly) return;

    // 이미지 전송
    if (previewImage && onSendImage) {
      const success = await onSendImage(previewImage.file);
      if (success) {
        setPreviewImage(null);
      }
      return;
    }

    // 텍스트 전송
    if (!inputValue.trim()) return;

    const message = inputValue;
    setInputValue('');
    
    const success = await onSendMessage(message);
    if (!success) {
      setInputValue(message); // Restore on failure
    }
    
    inputRef.current?.focus();
  };

  const handleEmojiSelect = (emoji: string) => {
    setInputValue((prev) => prev + emoji);
    setEmojiOpen(false);
    inputRef.current?.focus();
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreviewImage({ file, url });
    e.target.value = ''; // Reset input
  };

  const cancelImagePreview = () => {
    if (previewImage) {
      URL.revokeObjectURL(previewImage.url);
      setPreviewImage(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b p-4 bg-card">
          <div className="font-semibold">{partnerName}</div>
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
              <div className="h-12 w-48 rounded-2xl bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b px-4 py-3 bg-card">
        <h3 className="font-semibold">{partnerName}</h3>
        {readOnly && (
          <span className="text-xs text-muted-foreground">읽기 전용 모드</span>
        )}
      </div>

      {/* Messages */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-center">
              아직 대화가 없습니다.<br />
              {!readOnly && '첫 메시지를 보내보세요!'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg.message}
                messageType={msg.message_type}
                imageUrl={msg.image_url}
                senderNickname={msg.sender_nickname || '사용자'}
                timestamp={msg.created_at}
                isOwn={msg.sender_id === user?.id}
                isRead={msg.is_read}
              />
            ))}
          </div>
        )}
      </div>

      {/* Image Preview */}
      {previewImage && (
        <div className="px-3 py-2 border-t bg-card">
          <div className="relative inline-block">
            <img 
              src={previewImage.url} 
              alt="미리보기" 
              className="h-20 rounded-lg object-cover" 
            />
            <button
              onClick={cancelImagePreview}
              className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      {!readOnly && (
        <form onSubmit={handleSubmit} className="border-t p-3 bg-card">
          <div className="flex items-center gap-2">
            {/* 이모지 버튼 */}
            <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="shrink-0">
                  <Smile className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-2" side="top" align="start">
                <div className="grid grid-cols-8 gap-1">
                  {EMOJI_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="text-xl p-1 hover:bg-muted rounded transition-colors"
                      onClick={() => handleEmojiSelect(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* 사진 첨부 버튼 */}
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              className="shrink-0"
              onClick={() => imageInputRef.current?.click()}
              disabled={!!previewImage}
            >
              <ImageIcon className="h-5 w-5" />
            </Button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />

            {/* 카메라 버튼 (모바일) */}
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              className="shrink-0"
              onClick={() => cameraInputRef.current?.click()}
              disabled={!!previewImage}
            >
              <Camera className="h-5 w-5" />
            </Button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleImageSelect}
            />

            {/* 텍스트 입력 */}
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={previewImage ? "사진을 전송하세요" : "메시지를 입력하세요..."}
              disabled={sending || !!previewImage}
              className="flex-1"
            />

            {/* 전송 버튼 */}
            <Button 
              type="submit" 
              size="icon" 
              disabled={((!inputValue.trim() && !previewImage) || sending)}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}