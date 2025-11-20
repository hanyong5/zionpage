import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useParty } from "../context/PartyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function PartyModi() {
  const navigate = useNavigate();
  const { id } = useParams();
  const {
    updateParty,
    getPartyById,
    parties,
    loading: contextLoading,
  } = useParty();

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 모임 데이터 로드
  useEffect(() => {
    const loadParty = () => {
      const party = getPartyById(id);
      if (party) {
        // 날짜를 YYYY-MM-DD 형식으로 변환
        let partyDateFormatted = "";
        if (party.party_date) {
          const date = new Date(party.party_date);
          partyDateFormatted = date.toISOString().split("T")[0];
        }

        let startDateFormatted = "";
        if (party.start_date) {
          const date = new Date(party.start_date);
          startDateFormatted = date.toISOString().split("T")[0];
        }

        let endDateFormatted = "";
        if (party.end_date) {
          const date = new Date(party.end_date);
          endDateFormatted = date.toISOString().split("T")[0];
        }

        // 시간을 HH:00 형식으로 변환
        let startTimeFormatted = "";
        if (party.start_time) {
          if (typeof party.start_time === "string") {
            // "HH:MM:SS" 또는 "HH:MM" 형식에서 시간만 추출하여 "HH:00" 형식으로
            const timeMatch = party.start_time.match(/^(\d{2}):/);
            if (timeMatch) {
              startTimeFormatted = `${timeMatch[1]}:00`;
            } else {
              startTimeFormatted = party.start_time;
            }
          } else {
            startTimeFormatted = party.start_time;
          }
        }

        let endTimeFormatted = "";
        if (party.end_time) {
          if (typeof party.end_time === "string") {
            const timeMatch = party.end_time.match(/^(\d{2}):/);
            if (timeMatch) {
              endTimeFormatted = `${timeMatch[1]}:00`;
            } else {
              endTimeFormatted = party.end_time;
            }
          } else {
            endTimeFormatted = party.end_time;
          }
        }

        setFormData({
          title: party.title || "",
          description: party.description || "",
          party_date: partyDateFormatted,
          location: party.location || "",
          start_date: startDateFormatted,
          end_date: endDateFormatted,
          start_time: startTimeFormatted,
          end_time: endTimeFormatted,
        });
        setLoading(false);
      } else if (!contextLoading && parties.length > 0) {
        // 모임을 찾을 수 없을 때
        setError("모임을 찾을 수 없습니다.");
        setLoading(false);
      } else if (!contextLoading) {
        // parties가 아직 로드되지 않았을 때 잠시 대기
        const timer = setTimeout(loadParty, 100);
        return () => clearTimeout(timer);
      }
    };

    loadParty();
  }, [id, getPartyById, contextLoading, parties]);

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
      } else {
        partyData.description = null;
      }

      if (formData.location.trim()) {
        partyData.location = formData.location.trim();
      } else {
        partyData.location = null;
      }

      if (formData.start_date) {
        partyData.start_date = formData.start_date;
      } else {
        partyData.start_date = null;
      }

      if (formData.end_date) {
        partyData.end_date = formData.end_date;
      } else {
        partyData.end_date = null;
      }

      if (formData.start_time) {
        partyData.start_time = formData.start_time;
      } else {
        partyData.start_time = null;
      }

      if (formData.end_time) {
        partyData.end_time = formData.end_time;
      } else {
        partyData.end_time = null;
      }

      const result = await updateParty(id, partyData);
      if (result.success) {
        // 성공 시 리스트 페이지로 이동
        navigate("/party/partlist");
      } else {
        setError(result.error || "모임 수정에 실패했습니다.");
      }
    } catch (err) {
      setError("모임 수정 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-6">로딩 중...</div>;
  }

  if (error && !formData.title) {
    return (
      <div className="p-6">
        <div className="p-3 bg-destructive/10 text-destructive rounded-lg">
          {error}
        </div>
        <button
          onClick={() => navigate("/party/partlist")}
          className="mt-4 px-6 py-3 border rounded-lg font-medium hover:bg-accent transition-colors"
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6">
      <Card className="max-w-full sm:max-w-2xl md:max-w-4xl lg:max-w-6xl mx-auto">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold text-center">
            모임 수정하기
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
              <label htmlFor="location" className="block text-sm font-medium mb-2">
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
                {submitting ? "수정 중..." : "수정 완료"}
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

export default PartyModi;

