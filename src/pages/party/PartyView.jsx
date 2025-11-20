import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useParty } from "../context/PartyContext";
import { useZion } from "../context/ZionContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ko } from "date-fns/locale/ko";

const PARTS = ["SOPRANO", "ALTO", "TENOR", "BASS"];

function PartyView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    getPartyById,
    parties,
    loading: contextLoading,
    fetchPartyMembers,
  } = useParty();
  const { members } = useZion();
  const [party, setParty] = useState(null);
  const [partyMembers, setPartyMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const foundParty = getPartyById(id);
      if (foundParty) {
        setParty(foundParty);

        // 참석자 정보 로드
        const membersResult = await fetchPartyMembers(foundParty.id);
        if (membersResult.success) {
          setPartyMembers(membersResult.data);
        }

        setLoading(false);
      } else if (!contextLoading && parties.length > 0) {
        setLoading(false);
      } else if (!contextLoading) {
        const timer = setTimeout(loadData, 100);
        return () => clearTimeout(timer);
      }
    };

    loadData();
  }, [id, getPartyById, contextLoading, parties, fetchPartyMembers]);

  // 파트별로 멤버 필터링
  const getMembersByPart = (part) => {
    return members.filter(
      (member) => member.part === part && member.is_active !== false
    );
  };

  // 멤버의 참석 정보 가져오기
  const getMemberAttendance = (memberId) => {
    return partyMembers.find((pm) => pm.member_id === memberId);
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

  // 통계 계산
  const getStatistics = () => {
    const stats = {
      total: { all: 0, attend: 0, notAttend: 0, pending: 0 },
      byPart: {},
    };

    PARTS.forEach((part) => {
      stats.byPart[part] = {
        all: 0,
        attend: 0,
        notAttend: 0,
        pending: 0,
      };
    });

    // 전체 멤버 수 계산
    PARTS.forEach((part) => {
      const partMembers = getMembersByPart(part);
      stats.byPart[part].all = partMembers.length;
      stats.total.all += partMembers.length;
    });

    // 참석 정보 계산
    partyMembers.forEach((pm) => {
      const member = members.find((m) => m.id === pm.member_id);
      if (member && member.part) {
        const part = member.part;
        if (pm.status === "참석") {
          stats.byPart[part].attend += 1;
          stats.total.attend += 1;
        } else if (pm.status === "미참석") {
          stats.byPart[part].notAttend += 1;
          stats.total.notAttend += 1;
        } else if (pm.status === "미정") {
          stats.byPart[part].pending += 1;
          stats.total.pending += 1;
        }
      }
    });

    return stats;
  };

  const statistics = getStatistics();

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
    <div className="p-3 sm:p-4 md:p-6">
      <Card className="max-w-full sm:max-w-2xl md:max-w-4xl lg:max-w-6xl mx-auto">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold">
              {party.title || "제목 없음"}
            </CardTitle>
            <button
              onClick={() => navigate("/party/partlist")}
              className="px-4 py-2 border rounded-lg font-medium hover:bg-accent transition-colors text-sm sm:text-base"
            >
              목록으로
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          {/* 모임 날짜 */}
          {party.party_date && (
            <div>
              <span className="font-medium text-sm sm:text-base">
                모임 날짜:
              </span>{" "}
              <span className="text-muted-foreground">
                {format(new Date(party.party_date), "yyyy년 MM월 dd일", {
                  locale: ko,
                })}
              </span>
            </div>
          )}

          {/* 설명 */}
          {party.description && (
            <div>
              <span className="font-medium text-sm sm:text-base">설명:</span>
              <p className="mt-2 text-muted-foreground whitespace-pre-wrap">
                {party.description}
              </p>
            </div>
          )}

          {/* 장소 */}
          {party.location && (
            <div>
              <span className="font-medium text-sm sm:text-base">장소:</span>{" "}
              <span className="text-muted-foreground">{party.location}</span>
            </div>
          )}

          {/* 신청 가능 기간 */}
          {party.start_date && party.end_date && (
            <div>
              <span className="font-medium text-sm sm:text-base">
                신청 가능 기간:
              </span>{" "}
              <span className="text-muted-foreground">
                {format(new Date(party.start_date), "yyyy-MM-dd", {
                  locale: ko,
                })}{" "}
                ~{" "}
                {format(new Date(party.end_date), "yyyy-MM-dd", {
                  locale: ko,
                })}
              </span>
            </div>
          )}
          {party.start_date && !party.end_date && (
            <div>
              <span className="font-medium text-sm sm:text-base">
                신청 시작일:
              </span>{" "}
              <span className="text-muted-foreground">
                {format(new Date(party.start_date), "yyyy-MM-dd", {
                  locale: ko,
                })}
              </span>
            </div>
          )}
          {!party.start_date && party.end_date && (
            <div>
              <span className="font-medium text-sm sm:text-base">
                신청 종료일:
              </span>{" "}
              <span className="text-muted-foreground">
                {format(new Date(party.end_date), "yyyy-MM-dd", {
                  locale: ko,
                })}
              </span>
            </div>
          )}

          {/* 시작/종료 시간 */}
          {(party.start_time || party.end_time) && (
            <div>
              <span className="font-medium text-sm sm:text-base">시간:</span>{" "}
              <span className="text-muted-foreground">
                {party.start_time || "미정"} ~ {party.end_time || "미정"}
              </span>
            </div>
          )}

          {/* 생성일 */}
          {party.created_at && (
            <div>
              <span className="font-medium text-sm sm:text-base">생성일:</span>{" "}
              <span className="text-muted-foreground">
                {format(new Date(party.created_at), "yyyy-MM-dd HH:mm", {
                  locale: ko,
                })}
              </span>
            </div>
          )}

          {/* 통계 */}
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-xl font-bold mb-4">참석 통계</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {PARTS.map((part) => (
                <Card key={part} className="bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold">
                      {part}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>전체:</span>
                        <span className="font-medium">
                          {statistics.byPart[part].all}명
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-600">참석:</span>
                        <span className="font-medium text-green-600">
                          {statistics.byPart[part].attend}명
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-600">미참석:</span>
                        <span className="font-medium text-red-600">
                          {statistics.byPart[part].notAttend}명
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-yellow-600">미정:</span>
                        <span className="font-medium text-yellow-600">
                          {statistics.byPart[part].pending}명
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="bg-primary/10">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {statistics.total.all}
                    </div>
                    <div className="text-muted-foreground">전체 인원</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {statistics.total.attend}
                    </div>
                    <div className="text-muted-foreground">참석</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {statistics.total.notAttend}
                    </div>
                    <div className="text-muted-foreground">미참석</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {statistics.total.pending}
                    </div>
                    <div className="text-muted-foreground">미정</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 참석자 명단 */}
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-xl font-bold mb-4">참석자 명단</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {PARTS.map((part) => {
                const partMembers = getMembersByPart(part);
                const attendMembers = partMembers.filter((member) => {
                  const attendance = getMemberAttendance(member.id);
                  return attendance && attendance.status === "참석";
                });
                const notAttendMembers = partMembers.filter((member) => {
                  const attendance = getMemberAttendance(member.id);
                  return attendance && attendance.status === "미참석";
                });
                const pendingMembers = partMembers.filter((member) => {
                  const attendance = getMemberAttendance(member.id);
                  return attendance && attendance.status === "미정";
                });
                const noResponseMembers = partMembers.filter((member) => {
                  const attendance = getMemberAttendance(member.id);
                  return !attendance;
                });

                return (
                  <Card key={part} className="bg-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-semibold">
                        {part}
                        <span className="ml-2 text-sm text-muted-foreground">
                          ({partMembers.length}명)
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* 참석 */}
                      {attendMembers.length > 0 && (
                        <div className="mb-3">
                          <div className="text-sm font-medium text-green-600 mb-1">
                            참석 ({attendMembers.length}명)
                          </div>
                          <ul className="space-y-1">
                            {attendMembers.map((member) => {
                              const attendance = getMemberAttendance(member.id);
                              return (
                                <li
                                  key={member.id}
                                  className="text-sm p-2 bg-green-50 rounded"
                                >
                                  <div className="flex items-center justify-between">
                                    <span>{member.name}</span>
                                    <div
                                      className={`w-2 h-2 rounded-full ${getStatusColor(
                                        attendance.status
                                      )}`}
                                    />
                                  </div>
                                  {attendance?.memo && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {attendance.memo}
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}

                      {/* 미참석 */}
                      {notAttendMembers.length > 0 && (
                        <div className="mb-3">
                          <div className="text-sm font-medium text-red-600 mb-1">
                            미참석 ({notAttendMembers.length}명)
                          </div>
                          <ul className="space-y-1">
                            {notAttendMembers.map((member) => {
                              const attendance = getMemberAttendance(member.id);
                              return (
                                <li
                                  key={member.id}
                                  className="text-sm p-2 bg-red-50 rounded"
                                >
                                  <div className="flex items-center justify-between">
                                    <span>{member.name}</span>
                                    <div
                                      className={`w-2 h-2 rounded-full ${getStatusColor(
                                        attendance.status
                                      )}`}
                                    />
                                  </div>
                                  {attendance?.memo && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {attendance.memo}
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}

                      {/* 미정 */}
                      {pendingMembers.length > 0 && (
                        <div className="mb-3">
                          <div className="text-sm font-medium text-yellow-600 mb-1">
                            미정 ({pendingMembers.length}명)
                          </div>
                          <ul className="space-y-1">
                            {pendingMembers.map((member) => {
                              const attendance = getMemberAttendance(member.id);
                              return (
                                <li
                                  key={member.id}
                                  className="text-sm p-2 bg-yellow-50 rounded"
                                >
                                  <div className="flex items-center justify-between">
                                    <span>{member.name}</span>
                                    <div
                                      className={`w-2 h-2 rounded-full ${getStatusColor(
                                        attendance.status
                                      )}`}
                                    />
                                  </div>
                                  {attendance?.memo && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {attendance.memo}
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}

                      {/* 미응답 */}
                      {noResponseMembers.length > 0 && (
                        <div className="mb-3">
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            미응답 ({noResponseMembers.length}명)
                          </div>
                          <ul className="space-y-1">
                            {noResponseMembers.map((member) => (
                              <li
                                key={member.id}
                                className="text-sm p-2 bg-gray-50 rounded text-muted-foreground"
                              >
                                {member.name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {partMembers.length === 0 && (
                        <div className="text-sm text-muted-foreground">
                          멤버가 없습니다
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={() => navigate(`/party/modify/${party.id}`)}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              수정하기
            </button>
            <button
              onClick={() => navigate("/party/partlist")}
              className="px-6 py-3 border rounded-lg font-medium hover:bg-accent transition-colors"
            >
              목록으로
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PartyView;
