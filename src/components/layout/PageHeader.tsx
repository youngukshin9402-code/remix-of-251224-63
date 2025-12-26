/**
 * 공용 페이지 헤더 컴포넌트
 * 모든 양갱 탭에서 동일한 스타일/높이/위치를 보장합니다.
 */

interface PageHeaderProps {
  title: string;
  subtitle: string;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div className="min-h-[72px] flex flex-col justify-center">
      <h1 className="text-3xl font-bold text-foreground mb-2 leading-tight">{title}</h1>
      <p className="text-lg text-muted-foreground leading-snug">{subtitle}</p>
    </div>
  );
}
