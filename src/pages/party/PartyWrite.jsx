import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useParty } from "../context/PartyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function PartyWrite() {
  const navigate = useNavigate();
  const { addParty } = useParty();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    party_date: "",
    location: "",
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    // 유효성 검사
    if (!formData.title.trim()) {
      setError("제목을 입력해주세요.");
      setSubmitting(false);
      return;
    }

    if (!formData.party_date) {
      setError("모임 날짜를 선택해주세요.");
      setSubmitting(false);
      return;
    }

    // start_date와 end_date 유효성 검사
    if (formData.start_date && formData.end_date) {
      if (new Date(formData.start_date) > new Date(formData.end_date)) {
        setError("신청 시작일은 신청 종료일보다 이전이어야 합니다.");
        setSubmitting(false);
        return;
      }
    }

    try {
      const partyData = {
        title: formData.title.trim(),
        party_date: formData.party_date,
      };

      if (formData.description.trim()) {
        partyData.description = formData.description.trim();
      }
      if (formData.location.trim()) {
        partyData.location = formData.location.trim();
      }
      if (formData.start_date) {
        partyData.start_date = formData.start_date;
      }
      if (formData.end_date) {
        partyData.end_date = formData.end_date;
      }
      if (formData.start_time) {
        partyData.start_time = formData.start_time;
      }
      if (formData.end_time) {
        partyData.end_time = formData.end_time;
      }

      const result = await addParty(partyData);
      if (result.success) {
        // 성공 시 리스트 페이지로 이동
        navigate("/party/partlist");
      } else {
        setError(result.error || "모임 추가에 실패했습니다.");
      }
    } catch (err) {
      setError("모임 추가 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6">
      <Card className="max-w-full sm:max-w-2xl md:max-w-4xl lg:max-w-6xl mx-auto">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold text-center">
            모임 추가하기
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 제목 입력 */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-2">
                제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="모임 제목을 입력하세요"
              />
            </div>

            {/* 설명 입력 */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium mb-2"
              >
                설명
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="모임 설명을 입력하세요"
              />
            </div>

            {/* 모임 날짜 입력 */}
            <div>
              <label
                htmlFor="party_date"
                className="block text-sm font-medium mb-2"
              >
                모임 날짜 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="party_date"
                name="party_date"
                value={formData.party_date}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* 장소 입력 */}
            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium mb-2"
              >
                장소
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="모임 장소를 입력하세요"
              />
            </div>

            {/* 신청 시작일 입력 */}
            <div>
              <label
                htmlFor="start_date"
                className="block text-sm font-medium mb-2"
              >
                신청 시작일
              </label>
              <input
                type="date"
                id="start_date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* 신청 종료일 입력 */}
            <div>
              <label
                htmlFor="end_date"
                className="block text-sm font-medium mb-2"
              >
                신청 종료일
              </label>
              <input
                type="date"
                id="end_date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* 시작 시간 입력 */}
            <div>
              <label
                htmlFor="start_time"
                className="block text-sm font-medium mb-2"
              >
                시작 시간
              </label>
              <select
                id="start_time"
                name="start_time"
                value={formData.start_time}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">선택하세요</option>
                {Array.from({ length: 24 }, (_, i) => {
                  const hour = String(i).padStart(2, "0");
                  return (
                    <option key={hour} value={`${hour}:00`}>
                      {hour}:00
                    </option>
                  );
                })}
              </select>
            </div>

            {/* 종료 시간 입력 */}
            <div>
              <label
                htmlFor="end_time"
                className="block text-sm font-medium mb-2"
              >
                종료 시간
              </label>
              <select
                id="end_time"
                name="end_time"
                value={formData.end_time}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">선택하세요</option>
                {Array.from({ length: 24 }, (_, i) => {
                  const hour = String(i).padStart(2, "0");
                  return (
                    <option key={hour} value={`${hour}:00`}>
                      {hour}:00
                    </option>
                  );
                })}
              </select>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-lg">
                {error}
              </div>
            )}

            {/* 버튼 */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "추가 중..." : "모임 추가"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/party/partlist")}
                className="px-6 py-3 border rounded-lg font-medium hover:bg-accent transition-colors"
              >
                취소
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default PartyWrite;
