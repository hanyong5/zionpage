import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useYerim } from "../context/YerimContext";

function YerimMember() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getMemberById, loading } = useYerim();
  const [member, setMember] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setError("회원 ID가 필요합니다.");
      return;
    }

    const loadMember = () => {
      const foundMember = getMemberById(id);
      if (foundMember) {
        setMember(foundMember);
        setError(null);
      } else {
        setError("회원을 찾을 수 없습니다.");
      }
    };

    if (loading) {
      const timer = setTimeout(loadMember, 100);
      return () => clearTimeout(timer);
    } else {
      loadMember();
    }
  }, [id, getMemberById, loading]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
          {error}
        </div>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-4 py-2 border rounded-lg hover:bg-accent transition-colors"
        >
          뒤로 가기
        </button>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="p-6">
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
          회원 정보를 불러올 수 없습니다.
        </div>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-4 py-2 border rounded-lg hover:bg-accent transition-colors"
        >
          뒤로 가기
        </button>
      </div>
    );
  }

  // 생년월일 포맷팅
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold">회원 정보</h2>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 border rounded-lg hover:bg-accent transition-colors"
        >
          뒤로 가기
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* 사진 */}
          <div className="flex-shrink-0">
            {member.photo ? (
              <img
                src={member.photo}
                alt={member.name || "회원 사진"}
                className="w-48 h-48 object-cover rounded-lg border"
              />
            ) : (
              <div className="w-48 h-48 bg-gray-200 rounded-lg border flex items-center justify-center text-gray-400">
                사진 없음
              </div>
            )}
          </div>

          {/* 기본 정보 */}
          <div className="flex-1 space-y-4">
            {/* 이름 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이름
              </label>
              <div className="text-lg font-semibold">{member.name || "-"}</div>
            </div>

            {/* 전화번호 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                전화번호
              </label>
              <div className="text-base">{member.phone || "-"}</div>
            </div>

            {/* 생년월일 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                생년월일
              </label>
              <div className="text-base">{formatDate(member.birth)}</div>
            </div>

            {/* 가입일 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                가입일
              </label>
              <div className="text-base">{formatDate(member.join_date)}</div>
            </div>

            {/* 메모 */}
            {member.memo && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  메모
                </label>
                <div className="text-base whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border">
                  {member.memo}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default YerimMember;
