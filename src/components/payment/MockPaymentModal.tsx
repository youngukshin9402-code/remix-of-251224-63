import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Loader2,
  Shield,
  Package,
} from "lucide-react";
import type { PaymentIntent } from "@/hooks/usePayment";

interface MockPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentIntent: PaymentIntent | null;
  onConfirm: (paymentId: string, success: boolean) => Promise<boolean>;
  onCancel: (paymentId: string) => Promise<boolean>;
  loading?: boolean;
}

export function MockPaymentModal({
  open,
  onOpenChange,
  paymentIntent,
  onConfirm,
  onCancel,
  loading = false,
}: MockPaymentModalProps) {
  const [processing, setProcessing] = useState(false);

  const handlePaymentSuccess = async () => {
    if (!paymentIntent) return;
    setProcessing(true);
    const success = await onConfirm(paymentIntent.id, true);
    setProcessing(false);
    if (success) {
      onOpenChange(false);
    }
  };

  const handlePaymentFailure = async () => {
    if (!paymentIntent) return;
    setProcessing(true);
    await onConfirm(paymentIntent.id, false);
    setProcessing(false);
    onOpenChange(false);
  };

  const handleCancel = async () => {
    if (!paymentIntent) return;
    setProcessing(true);
    await onCancel(paymentIntent.id);
    setProcessing(false);
    onOpenChange(false);
  };

  if (!paymentIntent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            결제하기
          </DialogTitle>
          <DialogDescription>
            상품 정보를 확인하고 결제를 진행해주세요
          </DialogDescription>
        </DialogHeader>

        {/* 상품 정보 */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{paymentIntent.productName}</h3>
                <p className="text-sm text-muted-foreground">
                  주문번호: {paymentIntent.orderId.slice(-12)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* 결제 금액 */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">상품 금액</span>
            <span>{paymentIntent.amount.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">할인</span>
            <span className="text-green-600">-0원</span>
          </div>
          <Separator />
          <div className="flex justify-between font-semibold text-lg">
            <span>총 결제금액</span>
            <span className="text-primary">{paymentIntent.amount.toLocaleString()}원</span>
          </div>
        </div>

        {/* 테스트 안내 */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm">
            <Shield className="h-4 w-4" />
            <span className="font-medium">테스트 결제 모드</span>
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
            실제 결제가 이루어지지 않습니다. 아래 버튼으로 결제 결과를 선택하세요.
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {/* 테스트용 결제 버튼들 */}
          <div className="flex gap-2 w-full">
            <Button
              onClick={handlePaymentSuccess}
              disabled={processing || loading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {processing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              결제 성공
            </Button>
            <Button
              onClick={handlePaymentFailure}
              disabled={processing || loading}
              variant="destructive"
              className="flex-1"
            >
              {processing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              결제 실패
            </Button>
          </div>
          
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={processing || loading}
            className="w-full"
          >
            취소하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
