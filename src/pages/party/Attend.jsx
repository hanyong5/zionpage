import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useParty } from "../context/PartyContext";
import { useZion } from "../context/ZionContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ko } from "date-fns/locale/ko";

const PARTS = ["SOPRANO", "ALTO", "TENOR", "BASS"];

function Attend() {
  const { partyId } = useParams();
  const navigate = useNavigate();
  const { getPartyById, fetchPartyMembers, addPartyMember, updatePartyMember } =
    useParty();
  const { members } = useZion();

  const [party, setParty] = useState(null);
  const [partyMembers, setPartyMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);
  const [phoneLast4, setPhoneLast4] = useState("");
  const [status, setStatus] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // 파티 정보 및 참석 정보 로드
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const partyData = getPartyById(partyId);
      setParty(partyData);

      const membersResult = await fetchPartyMembers(parseInt(partyId));
      if (membersResult.success) {
        setPartyMembers(membersResult.data);
      }
      setLoading(false);
    };

    if (partyId) {
      loadData();
    }
  }, [partyId, getPartyById, fetchPartyMembers]);

  // 파트별로 멤버 필터링 (is_active가 true인 멤버만)
  const getMembersByPart = (part) => {
    return members.filter(
      (member) => member.part === part && member.is_active !== false
    );
  };

  // 멤버의 참석 정보 가져오기
  const getMemberAttendance = (memberId) => {
    return partyMembers.find((pm) => pm.member_id === memberId);
  };

  // 핸드폰 번호 뒤 4자리 추출
  const getPhoneLast4 = (phone) => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, ""); // 숫자만 추출
    return cleaned.slice(-4);
  };

  // 멤버 클릭 핸들러
  const handleMemberClick = (member) => {
    const attendance = getMemberAttendance(member.id);
    setSelectedMember(member);
    setPhoneLast4("");
    setStatus(attendance?.status || "");
    setMemo(attendance?.memo || "");
    setError(null);
  };

  // 핸드폰 뒤자리 확인
  const handlePhoneVerify = () => {
    if (!selectedMember) return;

    const memberPhoneLast4 = getPhoneLast4(selectedMember.phone);
    if (phoneLast4 !== memberPhoneLast4) {
      setError("핸드폰 번호 뒤 4자리가 일치하지 않습니다.");
      return false;
    }
    setError(null);
    return true;
  };

  // 참석 상태 저장
  const handleSaveStatus = async (newStatus) => {
    if (!selectedMember) return;

    // 핸드폰 번호 확인
    if (!handlePhoneVerify()) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const attendance = getMemberAttendance(selectedMember.id);
      const partyMemberData = {
        party_id: parseInt(partyId),
        member_id: selectedMember.id,
        status: newStatus,
        memo: memo.trim() || null,
      };

      let result;
      if (attendance) {
        // 수정
        result = await updatePartyMember(attendance.id, partyMemberData);
      } else {
        // 추가
        result = await addPartyMember(partyMemberData);
      }

      if (result.success) {
        // 참석 정보 새로고침
        const membersResult = await fetchPartyMembers(parseInt(partyId));
        if (membersResult.success) {
          setPartyMembers(membersResult.data);
        }
        setSelectedMember(null);
        setPhoneLast4("");
        setStatus("");
        setMemo("");
      } else {
        setError(result.error || "저장에 실패했습니다.");
      }
    } catch (err) {
      setError("저장 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  // 상태별 색상
  const getStatusColor = (status) => {
    switch (status) {
      case "참석":
        return "bg-green-500";
      case "미참석":
        return "bg-red-500";
      case "미정":
        return "bg-yellow-500";
      default:
        return "bg-gray-300";
    }
  };

  if (loading) {
    return <div className="p-6">로딩 중...</div>;
  }

  if (!party) {
    return (
      <div className="p-6">
        <div className="p-3 bg-destructive/10 text-destructive rounded-lg">
          모임을 찾을 수 없습니다.
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
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate("/party/partlist")}
          className="mb-4 px-4 py-2 border rounded-lg font-medium hover:bg-accent transition-colors"
        >
          ← 목록으로
        </button>
        <h2 className="text-3xl font-bold mb-2">{party.title}</h2>
        {party.party_date && (
          <p className="text-muted-foreground">
            {format(new Date(party.party_date), "yyyy년 MM월 dd일", {
              locale: ko,
            })}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {PARTS.map((part) => {
          const partMembers = getMembersByPart(part);
          return (
            <Card key={part} className="bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl font-semibold">
                  {part}
                  <span className="ml-2 text-sm text-muted-foreground">
                    ({partMembers.length}명)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {partMembers.length > 0 ? (
                    partMembers.map((member) => {
                      const attendance = getMemberAttendance(member.id);
                      return (
                        <li
                          key={member.id}
                          onClick={() => handleMemberClick(member)}
                          className={`p-3 rounded cursor-pointer transition-colors ${
                            selectedMember?.id === member.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted hover:bg-accent"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium">
                              {member.name || "이름 없음"}
                            </div>
                            {attendance && (
                              <div
                                className={`w-3 h-3 rounded-full ${getStatusColor(
                                  attendance.status
                                )}`}
                                title={attendance.status}
                              />
                            )}
                          </div>
                          {attendance?.memo && (
                            <div className="text-xs mt-1 opacity-80">
                              {attendance.memo}
                            </div>
                          )}
                        </li>
                      );
                    })
                  ) : (
                    <li className="text-muted-foreground text-sm">
                      멤버가 없습니다
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 참석 상태 입력 모달 */}
      {selectedMember && (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>
              {selectedMember.name} 참석 상태{" "}
              {getMemberAttendance(selectedMember.id) ? "수정" : "등록"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            {/* 핸드폰 번호 뒤 4자리 입력 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                핸드폰 번호 뒤 4자리
              </label>
              <input
                type="text"
                value={phoneLast4}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setPhoneLast4(value);
                  setError(null);
                }}
                placeholder="0000"
                maxLength={4}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* 메모 입력 */}
            <div>
              <label className="block text-sm font-medium mb-2">메모</label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="메모를 입력하세요 (선택사항)"
              />
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* 상태 버튼 */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleSaveStatus("참석")}
                disabled={submitting}
                className="px-4 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                참석
              </button>
              <button
                onClick={() => handleSaveStatus("미참석")}
                disabled={submitting}
                className="px-4 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                미참석
              </button>
              <button
                onClick={() => handleSaveStatus("미정")}
                disabled={submitting}
                className="px-4 py-3 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                미정
              </button>
            </div>

            {/* 취소 버튼 */}
            <button
              onClick={() => {
                setSelectedMember(null);
                setPhoneLast4("");
                setStatus("");
                setMemo("");
                setError(null);
              }}
              className="w-full px-4 py-2 border rounded-lg font-medium hover:bg-accent transition-colors"
            >
              취소
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default Attend;
