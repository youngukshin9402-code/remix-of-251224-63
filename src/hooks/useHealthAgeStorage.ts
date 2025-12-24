/**
 * 건강나이 결과 저장 훅 - localStorage 기반
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'yanggaeng_health_age_result';

export interface HealthAgeResult {
  actualAge: number;
  healthAge: number;
  bodyScore: number;
  analysis: string;
  recordDate: string;
  savedAt: string;
}

export function useHealthAgeStorage() {
  const [result, setResult] = useState<HealthAgeResult | null>(null);

  // localStorage에서 값 로드하는 함수
  const loadFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setResult(JSON.parse(stored));
      } else {
        setResult(null);
      }
    } catch (e) {
      console.error('Failed to load health age result:', e);
      setResult(null);
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // 다른 탭/컴포넌트에서 변경 시 실시간 동기화
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        loadFromStorage();
      }
    };

    // 같은 탭 내에서 변경 감지를 위한 커스텀 이벤트
    const handleCustomStorageChange = () => {
      loadFromStorage();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('healthAgeStorageChange', handleCustomStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('healthAgeStorageChange', handleCustomStorageChange);
    };
  }, [loadFromStorage]);

  // 저장
  const saveResult = useCallback((data: Omit<HealthAgeResult, 'savedAt'>) => {
    const toSave: HealthAgeResult = {
      ...data,
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      setResult(toSave);
      // 같은 탭 내 다른 컴포넌트에 변경 알림
      window.dispatchEvent(new Event('healthAgeStorageChange'));
    } catch (e) {
      console.error('Failed to save health age result:', e);
    }
  }, []);

  // 삭제
  const clearResult = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setResult(null);
      // 같은 탭 내 다른 컴포넌트에 변경 알림
      window.dispatchEvent(new Event('healthAgeStorageChange'));
    } catch (e) {
      console.error('Failed to clear health age result:', e);
    }
  }, []);

  return { result, saveResult, clearResult };
}
