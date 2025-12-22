import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface PaymentIntent {
  id: string;
  orderId: string;
  amount: number;
  productId: string;
  productName: string;
  status: "pending" | "paid" | "failed" | "canceled";
}

interface CreatePaymentParams {
  productId: string;
  productName: string;
  amount: number;
}

export function usePayment() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentPayment, setCurrentPayment] = useState<PaymentIntent | null>(null);

  // 결제 인텐트 생성 (추후 PG 연동 시 Edge Function으로 교체)
  const createPaymentIntent = useCallback(async (params: CreatePaymentParams): Promise<PaymentIntent | null> => {
    if (!user) {
      toast({ title: "로그인이 필요합니다", variant: "destructive" });
      return null;
    }

    setLoading(true);
    try {
      const orderId = `order_${user.id.slice(0, 8)}_${Date.now()}`;
      
      // payments 테이블에 pending 상태로 저장
      const { data, error } = await supabase
        .from("payments")
        .insert({
          user_id: user.id,
          product_id: params.productId,
          amount: params.amount,
          order_id: orderId,
          provider: "mock", // 추후 'stripe' 또는 'toss'로 변경
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      const paymentIntent: PaymentIntent = {
        id: data.id,
        orderId: data.order_id,
        amount: data.amount,
        productId: params.productId,
        productName: params.productName,
        status: "pending",
      };

      setCurrentPayment(paymentIntent);
      return paymentIntent;
    } catch (error) {
      console.error("Payment intent creation failed:", error);
      toast({ title: "결제 준비 실패", variant: "destructive" });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // 결제 확인 (추후 PG Webhook으로 교체)
  const confirmPayment = useCallback(async (paymentId: string, success: boolean): Promise<boolean> => {
    setLoading(true);
    try {
      const newStatus = success ? "paid" : "failed";
      const updateData: { status: string; paid_at?: string } = { status: newStatus };
      
      if (success) {
        updateData.paid_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("payments")
        .update(updateData)
        .eq("id", paymentId);

      if (error) throw error;

      if (success) {
        toast({ title: "결제가 완료되었습니다!" });
      } else {
        toast({ title: "결제가 실패했습니다", variant: "destructive" });
      }

      setCurrentPayment(null);
      return success;
    } catch (error) {
      console.error("Payment confirmation failed:", error);
      toast({ title: "결제 처리 오류", variant: "destructive" });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // 결제 취소
  const cancelPayment = useCallback(async (paymentId: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("payments")
        .update({ status: "canceled" })
        .eq("id", paymentId);

      if (error) throw error;

      toast({ title: "결제가 취소되었습니다" });
      setCurrentPayment(null);
      return true;
    } catch (error) {
      console.error("Payment cancellation failed:", error);
      toast({ title: "결제 취소 실패", variant: "destructive" });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // 사용자의 결제 내역 조회
  const getPaymentHistory = useCallback(async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Failed to fetch payment history:", error);
      return [];
    }
  }, [user]);

  // 특정 상품의 결제 상태 확인
  const checkProductPayment = useCallback(async (productId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from("payments")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .eq("status", "paid")
        .limit(1);

      if (error) throw error;
      return (data?.length ?? 0) > 0;
    } catch (error) {
      console.error("Failed to check product payment:", error);
      return false;
    }
  }, [user]);

  return {
    loading,
    currentPayment,
    createPaymentIntent,
    confirmPayment,
    cancelPayment,
    getPaymentHistory,
    checkProductPayment,
  };
}
