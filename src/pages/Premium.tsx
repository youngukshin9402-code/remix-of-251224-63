import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePayment } from "@/hooks/usePayment";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MockPaymentModal } from "@/components/payment/MockPaymentModal";
import {
  Crown,
  Check,
  X,
  Video,
  Brain,
  Heart,
  Star,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

// 4주 코칭 패키지 상품 정보
const COACHING_PRODUCT = {
  id: "coaching_4weeks",
  name: "4주 코칭 패키지",
  price: 199000,
  description: "전문 코치와 함께하는 4주 집중 코칭",
};

const plans = [
  {
    id: "basic",
    name: "베이직",
    price: 0,
    priceLabel: "무료",
    description: "건강 관리의 첫 걸음",
    features: [
      { text: "건강검진 AI 분석", included: true },
      { text: "식단 기록 및 피드백", included: true },
      { text: "일일 미션", included: true },
      { text: "포인트 적립", included: true },
      { text: "1:1 코칭 상담", included: false },
      { text: "영상 통화 코칭", included: false },
      { text: "맞춤형 미션 설정", included: false },
      { text: "우선 상담 예약", included: false },
    ],
  },
  {
    id: "premium",
    name: "프리미엄",
    price: 49900,
    priceLabel: "월 49,900원",
    description: "전문 코치와 함께하는 건강 관리",
    popular: true,
    features: [
      { text: "건강검진 AI 분석", included: true },
      { text: "식단 기록 및 피드백", included: true },
      { text: "일일 미션", included: true },
      { text: "포인트 적립 (2배)", included: true },
      { text: "1:1 코칭 상담", included: true },
      { text: "영상 통화 코칭", included: true },
      { text: "맞춤형 미션 설정", included: true },
      { text: "우선 상담 예약", included: true },
    ],
  },
];

export default function Premium() {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const {
    loading: paymentLoading,
    currentPayment,
    createPaymentIntent,
    confirmPayment,
    cancelPayment,
    checkProductPayment,
  } = usePayment();
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [hasPaidCoaching, setHasPaidCoaching] = useState(false);

  const currentPlan = profile?.subscription_tier || "basic";

  // 코칭 결제 상태 확인
  useEffect(() => {
    const checkPayment = async () => {
      const paid = await checkProductPayment(COACHING_PRODUCT.id);
      setHasPaidCoaching(paid);
    };
    checkPayment();
  }, [checkProductPayment]);

  const handleUpgrade = async () => {
    if (!profile) {
      toast({
        title: "로그인 필요",
        description: "프리미엄 구독을 위해 로그인해주세요.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    // Mock 결제 인텐트 생성
    const intent = await createPaymentIntent({
      productId: COACHING_PRODUCT.id,
      productName: COACHING_PRODUCT.name,
      amount: COACHING_PRODUCT.price,
    });

    if (intent) {
      setShowPaymentModal(true);
    }
  };

  const handlePaymentConfirm = async (paymentId: string, success: boolean) => {
    const result = await confirmPayment(paymentId, success);
    
    if (result && success) {
      // 결제 성공 시 프리미엄 업그레이드
      try {
        // 구독 생성
        await supabase.from("subscriptions").insert({
          user_id: profile!.id,
          payer_id: profile!.id,
          plan_type: "premium",
          price: COACHING_PRODUCT.price,
          payment_method: "mock",
          is_active: true,
          expires_at: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(), // 4주
        });

        // 프로필 업데이트
        await supabase
          .from("profiles")
          .update({ subscription_tier: "premium" })
          .eq("id", profile!.id);

        await refreshProfile();
        setHasPaidCoaching(true);

        toast({
          title: "결제 완료! 🎉",
          description: "4주 코칭 패키지가 활성화되었습니다.",
        });
      } catch (error) {
        console.error("Subscription update error:", error);
      }
    }
    
    return result;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold">프리미엄 구독</h1>
        </div>
        <p className="text-white/90">전문 코치와 함께 건강을 관리하세요</p>
      </div>

      {/* Current Plan Badge */}
      {currentPlan === "premium" && (
        <div className="px-4 -mt-4">
          <Card className="bg-gradient-to-r from-amber-100 to-orange-100 border-amber-300">
            <CardContent className="py-4 flex items-center gap-3">
              <Crown className="h-6 w-6 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-800">프리미엄 회원</p>
                <p className="text-sm text-amber-700">모든 기능을 이용 중입니다</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Plans */}
      <div className="p-4 space-y-4 mt-4">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative overflow-hidden ${
              plan.popular
                ? "border-2 border-primary shadow-lg"
                : "border-border"
            }`}
          >
            {plan.popular && (
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-sm font-medium rounded-bl-lg">
                <Sparkles className="h-4 w-4 inline mr-1" />
                추천
              </div>
            )}

            <CardHeader>
              <div className="flex items-center gap-2">
                {plan.id === "premium" ? (
                  <Crown className="h-6 w-6 text-amber-500" />
                ) : (
                  <Heart className="h-6 w-6 text-muted-foreground" />
                )}
                <CardTitle className="text-xl">{plan.name}</CardTitle>
              </div>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-2">
                <span className="text-3xl font-bold">{plan.priceLabel}</span>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                {plan.features.map((feature, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 ${
                      feature.included ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {feature.included ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <X className="h-5 w-5 text-muted-foreground/50" />
                    )}
                    <span className={!feature.included ? "line-through" : ""}>
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>

              {plan.id === "premium" && currentPlan !== "premium" && (
                <Button
                  className="w-full h-14 text-lg"
                  onClick={handleUpgrade}
                >
                  <Crown className="mr-2 h-5 w-5" />
                  프리미엄 시작하기
                </Button>
              )}

              {plan.id === currentPlan && (
                <Badge variant="secondary" className="w-full justify-center py-2">
                  현재 이용 중
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Premium Benefits */}
      <div className="p-4 mt-4">
        <h2 className="text-xl font-bold mb-4">프리미엄 혜택</h2>
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="py-4 text-center">
              <Video className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="font-semibold text-blue-800">영상 코칭</p>
              <p className="text-sm text-blue-600">전문 코치와 1:1 상담</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="py-4 text-center">
              <Brain className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <p className="font-semibold text-purple-800">맞춤 미션</p>
              <p className="text-sm text-purple-600">개인화된 건강 미션</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="py-4 text-center">
              <Star className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="font-semibold text-green-800">2배 포인트</p>
              <p className="text-sm text-green-600">모든 활동에 적용</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="py-4 text-center">
              <Crown className="h-8 w-8 mx-auto mb-2 text-amber-600" />
              <p className="font-semibold text-amber-800">우선 예약</p>
              <p className="text-sm text-amber-600">인기 시간대 우선 배정</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mock Payment Modal */}
      <MockPaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        paymentIntent={currentPayment}
        onConfirm={handlePaymentConfirm}
        onCancel={cancelPayment}
        loading={paymentLoading}
      />
    </div>
  );
}
