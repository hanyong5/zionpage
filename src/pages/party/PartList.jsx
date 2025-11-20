import React, { useState, useEffect } from "react";
import { useParty } from "../context/PartyContext";
import { useZion } from "../context/ZionContext";
import { format } from "date-fns";
import { ko } from "date-fns/locale/ko";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";

const PARTS = ["SOPRANO", "ALTO", "TENOR", "BASS"];

function PartList() {
  const { parties, loading, error, deleteParty, fetchPartyMembers } =
    useParty();
  const { members } = useZion();
  const [deletingId, setDeletingId] = useState(null);
  const [partyMembersData, setPartyMembersData] = useState({});

  // 모든 모임의 참석 정보 로드
  useEffect(() => {
    const loadAllPartyMembers = async () => {
      const data = {};
      for (const party of parties) {
        const result = await fetchPartyMembers(party.id);
        if (result.success) {
          data[party.id] = result.data;
        }
      }
      setPartyMembersData(data);
    };

    if (parties.length > 0) {
      loadAllPartyMembers();
    }
  }, [parties, fetchPartyMembers]);

  // 파트별 참석 인원 계산
  const getAttendanceByPart = (partyId) => {
    const partyMembers = partyMembersData[partyId] || [];
    const attendanceByPart = {
      SOPRANO: { total: 0, attend: 0 },
      ALTO: { total: 0, attend: 0 },
      TENOR: { total: 0, attend: 0 },
      BASS: { total: 0, attend: 0 },
      total: { total: 0, attend: 0 },
    };

    // 각 파트의 전체 멤버 수
    PARTS.forEach((part) => {
      const partMembers = members.filter(
        (member) => member.part === part && member.is_active !== false
      );
      attendanceByPart[part].total = partMembers.length;
      attendanceByPart.total.total += partMembers.length;
    });

    // 참석한 멤버 수 계산
    partyMembers.forEach((pm) => {
      if (pm.status === "참석") {
        const member = members.find((m) => m.id === pm.member_id);
        if (member && member.part) {
          attendanceByPart[member.part].attend += 1;
          attendanceByPart.total.attend += 1;
        }
      }
    });

    return attendanceByPart;
  };

  if (loading) {
    return <div className="p-6">로딩 중...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">에러 발생: {error}</div>;
  }

  const handleDelete = async (id) => {
    if (!window.confirm("정말로 이 모임을 삭제하시겠습니까?")) {
      return;
    }

    setDeletingId(id);
    const result = await deleteParty(id);
    if (!result.success) {
      alert("삭제에 실패했습니다: " + result.error);
    }
    setDeletingId(null);
  };

  return (
    <div className=" sm:p-4 md:p-6">
      <Card className="max-w-full sm:max-w-2xl md:max-w-4xl lg:max-w-6xl mx-auto">
        <CardHeader className="p-4 sm:p-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold">
              모임 리스트
            </CardTitle>
            <Link
              to="/party/write"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm sm:text-base"
            >
              모임 추가하기
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {parties.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              모임 데이터가 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {parties.map((party) => {
                const attendanceByPart = getAttendanceByPart(party.id);
                return (
                  <div
                    key={party.id}
                    className="border rounded-lg p-4 bg-card hover:bg-accent transition-colors"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-2 flex-1">
                          <Link
                            to={`/party/view/${party.id}`}
                            className="text-lg sm:text-xl font-semibold hover:text-primary transition-colors cursor-pointer"
                          >
                            {party.title || "제목 없음"}
                          </Link>
                          {party.party_date && (
                            <div className="text-sm sm:text-base font-medium text-muted-foreground">
                              {format(
                                new Date(party.party_date),
                                "yyyy년 MM월 dd일 (EEE)",
                                {
                                  locale: ko,
                                }
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* {party.description && (
                      <p className="text-sm sm:text-base text-muted-foreground">
                        {party.description}
                      </p>
                    )} */}

                      <div className="flex flex-wrap gap-4 text-sm sm:text-base text-muted-foreground">
                        {party.location && (
                          <div>
                            <span className="font-bold bg-blue-500 text-white px-3 py-1 rounded">
                              {party.location}
                            </span>
                          </div>
                        )}
                        {party.start_time && party.end_time && (
                          <div>
                            <span className="font-bold bg-pink-500 text-white px-3 py-1 rounded">
                              {party.start_time
                                ? party.start_time.slice(0, 5)
                                : ""}{" "}
                              ~{" "}
                              {party.end_time ? party.end_time.slice(0, 5) : ""}
                            </span>
                          </div>
                        )}

                        {party.start_date && party.end_date && (
                          <div>
                            <span className="font-medium">신청기간 : </span>{" "}
                            {format(new Date(party.start_date), "yyyy-MM-dd", {
                              locale: ko,
                            })}{" "}
                            ~{" "}
                            {format(new Date(party.end_date), "yyyy-MM-dd", {
                              locale: ko,
                            })}
                          </div>
                        )}
                        {party.start_date && !party.end_date && (
                          <div>
                            <span className="font-medium">신청 시작일:</span>{" "}
                            {format(new Date(party.start_date), "yyyy-MM-dd", {
                              locale: ko,
                            })}
                          </div>
                        )}
                        {!party.start_date && party.end_date && (
                          <div>
                            <span className="font-medium">신청 종료일:</span>{" "}
                            {format(new Date(party.end_date), "yyyy-MM-dd", {
                              locale: ko,
                            })}
                          </div>
                        )}
                      </div>

                      {/* 참석자 요약 */}
                      <div className="mt-2 py-1 border-t border-b">
                        <div className="flex flex-wrap gap-4 text-sm">
                          {PARTS.map((part) => (
                            <div key={part} className="flex items-center gap-1">
                              <span className="font-medium">{part[0]}</span>
                              <span className="text-primary font-semibold">
                                {attendanceByPart[part].attend}/
                                {attendanceByPart[part].total}
                              </span>
                            </div>
                          ))}
                          <div className="flex items-center gap-1 font-bold border-l pl-4 ml-2">
                            <span>참석:</span>
                            <span className="text-primary font-semibold text-base">
                              {attendanceByPart.total.attend}
                            </span>
                            <span className="text-muted-foreground">
                              /{attendanceByPart.total.total}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 버튼 영역 */}
                      <div className="flex gap-2 pt-2 flex-wrap justify-end">
                        {/* <Link
                          to={`/party/attend/${party.id}`}
                          className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                        >
                          참석명단보기
                        </Link> */}
                        <Link
                          to={`/party/view/${party.id}`}
                          className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                        >
                          보기
                        </Link>
                        <Link
                          to={`/party/modify/${party.id}`}
                          className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
                        >
                          수정
                        </Link>
                        <button
                          onClick={() => handleDelete(party.id)}
                          disabled={deletingId === party.id}
                          className="px-3 py-1 text-sm text-white bg-amber-500  rounded-md  disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {deletingId === party.id ? "삭제 중..." : "삭제"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default PartList;
