import React, { useState, useEffect } from "react";
import { useParty } from "../context/PartyContext";
import { useZion } from "../context/ZionContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ko } from "date-fns/locale/ko";

const PARTS = ["SOPRANO", "ALTO", "TENOR", "BASS"];

function AttendModal({ party, onClose }) {
  const { fetchPartyMembers, addPartyMember, updatePartyMember } = useParty();
  const { members } = useZion();

  const [partyMembers, setPartyMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPart, setSelectedPart] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [phoneLast4, setPhoneLast4] = useState("");
  const [status, setStatus] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // 참석 정보 로드
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const membersResult = await fetchPartyMembers(party.id);
      if (membersResult.success) {
        setPartyMembers(membersResult.data);
      }
      setLoading(false);
    };

    if (party) {
      loadData();
    }
  }, [party, fetchPartyMembers]);

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
        party_id: party.id,
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
        const membersResult = await fetchPartyMembers(party.id);
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
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">로딩 중...</div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">{party.title}</h2>
              {party.party_date && (
                <p className="text-muted-foreground">
                  {format(new Date(party.party_date), "yyyy년 MM월 dd일", {
                    locale: ko,
                  })}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg font-medium hover:bg-accent transition-colors"
            >
              닫기
            </button>
          </div>

          {/* 파트 선택 또는 멤버 리스트 */}
          {!selectedPart ? (
            // 파트 리스트
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {PARTS.map((part) => {
                const partMembers = getMembersByPart(part);
                return (
                  <Card
                    key={part}
                    className="bg-card shadow-sm cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => setSelectedPart(part)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-xl font-semibold text-center">
                        {part}
                        <span className="ml-2 text-sm text-muted-foreground">
                          ({partMembers.length}명)
                        </span>
                      </CardTitle>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          ) : (
            // 선택된 파트의 멤버 리스트
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => {
                    setSelectedPart(null);
                    setSelectedMember(null);
                  }}
                  className="px-4 py-2 border rounded-lg font-medium hover:bg-accent transition-colors"
                >
                  ← 파트 선택으로
                </button>
                <h3 className="text-2xl font-bold">{selectedPart}</h3>
                <div></div>
              </div>
              <Card className="bg-card shadow-sm">
                <CardContent className="p-4">
                  <ul className="space-y-2">
                    {getMembersByPart(selectedPart).length > 0 ? (
                      getMembersByPart(selectedPart).map((member) => {
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
            </div>
          )}

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
                      const value = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 4);
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
      </div>
    </div>
  );
}

export default AttendModal;
