import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useZion } from "../context/ZionContext";

const PARTS = ["SOPRANO", "ALTO", "TENOR", "BASS"];

function ZionWrite() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addMember } = useZion();

  // URL 쿼리 파라미터에서 파트 가져오기
  const partFromUrl = searchParams.get("part");
  const initialPart =
    partFromUrl && PARTS.includes(partFromUrl) ? partFromUrl : "SOPRANO";

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    birth: "",
    part: initialPart,
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
    if (!formData.name.trim()) {
      setError("이름을 입력해주세요.");
      setSubmitting(false);
      return;
    }

    if (!formData.part) {
      setError("파트를 선택해주세요.");
      setSubmitting(false);
      return;
    }

    try {
      const result = await addMember(formData);
      if (result.success) {
        // 성공 시 리스트 페이지로 이동
        navigate("/zion/list");
      } else {
        setError(result.error || "멤버 추가에 실패했습니다.");
      }
    } catch (err) {
      setError("멤버 추가 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">멤버 추가하기</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 이름 입력 */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-2">
            이름 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="이름을 입력하세요"
          />
        </div>

        {/* 전화번호 입력 */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-2">
            전화번호
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="전화번호를 입력하세요 (선택사항)"
          />
        </div>

        {/* 생년월일 입력 */}
        <div>
          <label htmlFor="birth" className="block text-sm font-medium mb-2">
            생년월일
          </label>
          <input
            type="date"
            id="birth"
            name="birth"
            value={formData.birth}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* 파트 선택 (라디오 버튼) */}
        <div>
          <label className="block text-sm font-medium mb-3">
            파트 <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {PARTS.map((part) => (
              <label
                key={part}
                className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                  formData.part === part
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-accent"
                }`}
              >
                <input
                  type="radio"
                  name="part"
                  value={part}
                  checked={formData.part === part}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="font-medium">{part}</span>
              </label>
            ))}
          </div>
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
            {submitting ? "추가 중..." : "멤버 추가"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/zion/list")}
            className="px-6 py-3 border rounded-lg font-medium hover:bg-accent transition-colors"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}

export default ZionWrite;
