import React, { useState, useEffect } from "react";
import supabase from "../../utils/supabase";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "selectedMinistries";

function SelectorComp({ onSelectionChange }) {
  const [ministries, setMinistries] = useState([]);
  const [selectedMinistries, setSelectedMinistries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 로컬스토리지에서 선택된 ministry ID들 불러오기
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSelectedMinistries(Array.isArray(parsed) ? parsed : []);
      }
    } catch (err) {
      console.error("로컬스토리지 읽기 오류:", err);
    }
  }, []);

  // ministry 테이블에서 데이터 가져오기
  useEffect(() => {
    const fetchMinistries = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: ministryError } = await supabase
          .from("ministry")
          .select("id, name")
          .order("name");

        if (ministryError) {
          setError(ministryError.message);
          setMinistries([]);
        } else {
          setMinistries(data || []);
        }
      } catch (err) {
        console.error("Ministry 데이터 가져오기 오류:", err);
        setError(
          err.message || "Ministry 데이터를 가져오는 중 오류가 발생했습니다."
        );
        setMinistries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMinistries();
  }, []);

  // 선택 상태 변경 및 로컬스토리지 저장
  const handleToggleMinistry = (ministryId) => {
    setSelectedMinistries((prev) => {
      const isSelected = prev.includes(ministryId);
      const newSelection = isSelected
        ? prev.filter((id) => id !== ministryId)
        : [...prev, ministryId];

      // 로컬스토리지에 저장
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSelection));
        // 부모 컴포넌트에 선택 변경 알림
        if (onSelectionChange) {
          onSelectionChange(newSelection);
        }
      } catch (err) {
        console.error("로컬스토리지 저장 오류:", err);
      }

      return newSelection;
    });
  };

  // 로딩 중일 때
  if (loading) {
    return <div className="p-4">로딩 중...</div>;
  }

  // 에러 발생 시
  if (error) {
    return <div className="p-4 text-red-500">오류: {error}</div>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {ministries.length === 0 ? (
          <p className="text-muted-foreground">Ministry 데이터가 없습니다.</p>
        ) : (
          ministries.map((ministry) => {
            const isSelected = selectedMinistries.includes(ministry.id);
            return (
              <Button
                key={ministry.id}
                variant={isSelected ? "default" : "outline"}
                className={`min-w-[120px] relative ${
                  isSelected ? "bg-primary text-primary-foreground" : ""
                }`}
                onClick={() => handleToggleMinistry(ministry.id)}
                type="button"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    className="w-4 h-4 cursor-pointer pointer-events-none"
                  />
                  <span>{ministry.name}</span>
                </div>
              </Button>
            );
          })
        )}
      </div>
      {selectedMinistries.length > 0 && (
        <div className="mt-4 p-3 bg-muted rounded-md">
          <p className="text-sm text-muted-foreground">
            선택된 항목: {selectedMinistries.length}개
          </p>
        </div>
      )}
    </div>
  );
}

export default SelectorComp;
