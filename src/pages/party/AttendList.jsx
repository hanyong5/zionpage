import React, { useState, useEffect } from "react";
import { useParty } from "../context/PartyContext";
import { useZion } from "../context/ZionContext";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ko } from "date-fns/locale/ko";
import AttendModal from "./AttendModal";

const PARTS = ["SOPRANO", "ALTO", "TENOR", "BASS"];

function AttendList() {
  const { parties, loading: partiesLoading, fetchPartyMembers } = useParty();
  const { members } = useZion();
  const [selectedParty, setSelectedParty] = useState(null);
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
    };

    // 각 파트의 전체 멤버 수
    PARTS.forEach((part) => {
      const partMembers = members.filter(
        (member) => member.part === part && member.is_active !== false
      );
      attendanceByPart[part].total = partMembers.length;
    });

    // 참석한 멤버 수 계산
    partyMembers.forEach((pm) => {
      if (pm.status === "참석") {
        const member = members.find((m) => m.id === pm.member_id);
        if (member && member.part) {
          attendanceByPart[member.part].attend += 1;
        }
      }
    });

    return attendanceByPart;
  };

  // start_date와 end_date 기준으로 필터링 및 정렬
  const getFilteredParties = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return parties
      .filter((party) => {
        // start_date와 end_date가 모두 있는 경우
        if (party.start_date && party.end_date) {
          const startDate = new Date(party.start_date);
          const endDate = new Date(party.end_date);
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
          return today >= startDate && today <= endDate;
        }
        // start_date만 있는 경우
        if (party.start_date && !party.end_date) {
          const startDate = new Date(party.start_date);
          startDate.setHours(0, 0, 0, 0);
          return today >= startDate;
        }
        // end_date만 있는 경우
        if (!party.start_date && party.end_date) {
          const endDate = new Date(party.end_date);
          endDate.setHours(23, 59, 59, 999);
          return today <= endDate;
        }
        // start_date와 end_date가 모두 없는 경우는 모두 표시
        return true;
      })
      .sort((a, b) => {
        // start_date 기준으로 정렬 (없으면 end_date, 그것도 없으면 party_date)
        const aDate = a.start_date
          ? new Date(a.start_date)
          : a.end_date
          ? new Date(a.end_date)
          : a.party_date
          ? new Date(a.party_date)
          : new Date(0);
        const bDate = b.start_date
          ? new Date(b.start_date)
          : b.end_date
          ? new Date(b.end_date)
          : b.party_date
          ? new Date(b.party_date)
          : new Date(0);
        return aDate - bDate;
      });
  };

  const filteredParties = getFilteredParties();

  if (partiesLoading) {
    return <div className="p-6">로딩 중...</div>;
  }

  return (
    <div className="">
      <h2 className="text-3xl font-bold mb-6 ">모임 참석 관리</h2>

      <div className="space-y-4">
        {filteredParties.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            신청 가능한 모임이 없습니다.
          </div>
        ) : (
          filteredParties.map((party) => {
            const attendanceByPart = getAttendanceByPart(party.id);
            return (
              <Card
                key={party.id}
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => setSelectedParty(party)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 flex flex-col gap-1">
                      <h3 className="text-lg font-semibold">
                        {party.title || "제목 없음"}
                      </h3>
                      {party.party_date && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(
                            new Date(party.party_date),
                            "yyyy년 MM월 dd일",
                            {
                              locale: ko,
                            }
                          )}
                        </p>
                      )}

                      <div className="flex  gap-1">
                        {party.location && (
                          <span className="text-sm bg-blue-500 text-white px-3 py-1 rounded mt-1">
                            {party.location}
                          </span>
                        )}
                        {party.start_time && party.end_time && (
                          <span className="text-sm bg-pink-500 text-white px-3 py-1 rounded mt-1">
                            {party.start_time} ~ {party.end_time}
                          </span>
                        )}
                      </div>
                      {/* 신청 가능 기간 */}
                      {party.start_date && party.end_date && (
                        <p className="text-sm text-muted-foreground">
                          신청 가능 기간:{" "}
                          {format(new Date(party.start_date), "yyyy-MM-dd", {
                            locale: ko,
                          })}{" "}
                          ~{" "}
                          {format(new Date(party.end_date), "yyyy-MM-dd", {
                            locale: ko,
                          })}
                        </p>
                      )}
                      {party.start_date && !party.end_date && (
                        <p className="text-sm text-muted-foreground">
                          신청 시작일:{" "}
                          {format(new Date(party.start_date), "yyyy-MM-dd", {
                            locale: ko,
                          })}
                        </p>
                      )}
                      {!party.start_date && party.end_date && (
                        <p className="text-sm text-muted-foreground">
                          신청 종료일:{" "}
                          {format(new Date(party.end_date), "yyyy-MM-dd", {
                            locale: ko,
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-primary font-medium ml-4 self-end flex justify-end">
                    <button className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors">
                      참석하기
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* 모달 */}
      {selectedParty && (
        <AttendModal
          party={selectedParty}
          onClose={async () => {
            setSelectedParty(null);
            // 참석 정보 새로고침
            const result = await fetchPartyMembers(selectedParty.id);
            if (result.success) {
              setPartyMembersData((prev) => ({
                ...prev,
                [selectedParty.id]: result.data,
              }));
            }
          }}
        />
      )}
    </div>
  );
}

export default AttendList;
