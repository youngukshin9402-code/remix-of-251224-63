import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NutritionData {
  meals: {
    mealType: string;
    foods: string[];
    calories: number;
  }[];
  totals: {
    totalCalories: number;
    totalCarbs: number;
    totalProtein: number;
    totalFat: number;
  };
  goals: {
    calorieGoal: number;
    carbGoalG: number;
    proteinGoalG: number;
    fatGoalG: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const { nutritionData } = await req.json() as { nutritionData: NutritionData };

    // 식단 요약 생성
    const mealSummary = nutritionData.meals
      .map(m => `${m.mealType}: ${m.foods.join(", ")} (${m.calories}kcal)`)
      .join("\n");

    const prompt = `당신은 전문 영양사입니다. 다음 하루 식단을 평가해주세요.

오늘 식단:
${mealSummary}

영양 섭취:
- 총 칼로리: ${nutritionData.totals.totalCalories}kcal (목표: ${nutritionData.goals.calorieGoal}kcal)
- 탄수화물: ${nutritionData.totals.totalCarbs}g (목표: ${nutritionData.goals.carbGoalG}g)
- 단백질: ${nutritionData.totals.totalProtein}g (목표: ${nutritionData.goals.proteinGoalG}g)
- 지방: ${nutritionData.totals.totalFat}g (목표: ${nutritionData.goals.fatGoalG}g)

다음 JSON 형식으로 응답해주세요. 반드시 한국어로 작성하고, 친근하고 격려하는 톤을 사용하세요:
{
  "summary": "한 줄 종합 평가 (20자 내외)",
  "balanceEvaluation": "탄단지 균형에 대한 평가 (2-3문장, 구체적인 수치 언급)",
  "improvements": ["개선점 1 (한 줄)", "개선점 2 (한 줄)", "개선점 3 (한 줄)"],
  "recommendations": ["오늘 추천 1 (구체적인 행동)", "오늘 추천 2 (구체적인 행동)"]
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: '당신은 친절하고 실용적인 조언을 주는 영양사입니다. 항상 JSON 형식으로 응답합니다. 한국어로 응답합니다.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error('AI 응답을 받지 못했습니다');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // JSON 파싱
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', content);
      throw new Error('피드백 형식 오류');
    }

    const feedback = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({ feedback }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in diet-feedback function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
