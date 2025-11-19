import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useZion } from "../context/ZionContext";

const PARTS = ["SOPRANO", "ALTO", "TENOR", "BASS"];

function ZionModi() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { updateMember, getMemberById, loading: contextLoading } = useZion();

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    birth: "",
    part: "SOPRANO",
    memo: "",
    join_date: "",
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 멤버 데이터 로드
  useEffect(() => {
    const loadMember = () => {
      const member = getMemberById(id);
      if (member) {
        setFormData({
          name: member.name || "",
          phone: member.phone || "",
          birth: member.birth || "",
          part: member.part || "SOPRANO",
          memo: member.memo || "",
          join_date: member.join_date || "",
          is_active: member.is_active !== false,
        });
        setLoading(false);
      } else if (!contextLoading) {
        // 멤버를 찾을 수 없을 때
        setError("멤버를 찾을 수 없습니다.");
        setLoading(false);
      }
    };

    // Context가 로딩 중이면 잠시 대기
    if (contextLoading) {
      const timer = setTimeout(loadMember, 100);
      return () => clearTimeout(timer);
    } else {
      loadMember();
    }
  }, [id, getMemberById, contextLoading]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
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
      const result = await updateMember(id, formData);
      if (result.success) {
        // 성공 시 리스트 페이지로 이동
        navigate("/zion/list");
      } else {
        setError(result.error || "멤버 수정에 실패했습니다.");
      }
    } catch (err) {
      setError("멤버 수정 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-6">로딩 중...</div>;
  }

  if (error && !formData.name) {
    return (
      <div className="p-6">
        <div className="p-3 bg-destructive/10 text-destructive rounded-lg">
          {error}
        </div>
        <button
          onClick={() => navigate("/zion/list")}
          className="mt-4 px-6 py-3 border rounded-lg font-medium hover:bg-accent transition-colors"
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">멤버 수정하기</h2>

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

        {/* 가입일 입력 */}
        <div>
          <label htmlFor="join_date" className="block text-sm font-medium mb-2">
            가입일
          </label>
          <input
            type="date"
            id="join_date"
            name="join_date"
            value={formData.join_date}
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

        {/* 메모 입력 */}
        <div>
          <label htmlFor="memo" className="block text-sm font-medium mb-2">
            메모
          </label>
          <textarea
            id="memo"
            name="memo"
            value={formData.memo}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            placeholder="메모를 입력하세요 (선택사항)"
          />
        </div>

        {/* 활성 상태 체크박스 */}
        <div>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="mr-2 w-4 h-4"
            />
            <span className="text-sm font-medium">활성 상태</span>
          </label>
          <p className="text-xs text-muted-foreground mt-1">
            체크 해제 시 리스트에서 숨겨집니다.
          </p>
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

export default ZionModi;
