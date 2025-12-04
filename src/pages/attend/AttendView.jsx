import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDaysInMonth,
} from "date-fns";
import { ko } from "date-fns/locale/ko";
import supabase from "../../utils/supabase";
import { Link } from "react-router-dom";

function AttendView() {
  const [selectedMonth, setSelectedMonth] = useState(
    format(new Date(), "yyyy-MM")
  );
  const [attendances, setAttendances] = useState([]);
  const [ministries, setMinistries] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMinistry, setSelectedMinistry] = useState(null);

  // 선택한 월의 시작일과 종료일 (메모이제이션)
  const monthStart = useMemo(
    () => startOfMonth(new Date(selectedMonth + "-01")),
    [selectedMonth]
  );
  const monthEnd = useMemo(
    () => endOfMonth(new Date(selectedMonth + "-01")),
    [selectedMonth]
  );
  const daysInMonth = getDaysInMonth(monthStart);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // 출석부가 생성된 날짜만 추출
  const attendanceDates = useMemo(() => {
    const dateSet = new Set();
    attendances.forEach((attendance) => {
      if (!selectedMinistry || attendance.ministryName === selectedMinistry) {
        dateSet.add(attendance.attendance_date);
      }
    });

    // 날짜를 정렬하여 반환 (Date 객체로 변환)
    return Array.from(dateSet)
      .sort()
      .map((dateString) => new Date(dateString));
  }, [attendances, selectedMinistry]);

  // 출석부 데이터 가져오기 함수
  const fetchAttendances = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const startDate = format(monthStart, "yyyy-MM-dd");
      const endDate = format(monthEnd, "yyyy-MM-dd");

      // 선택한 월의 모든 출석부 가져오기
      const { data, error: attendError } = await supabase
        .from("attend")
        .select(
          `
            *,
            member:members(id, name, phone),
            ministry:ministry(id, name)
          `
        )
        .gte("attendance_date", startDate)
        .lte("attendance_date", endDate)
        .order("attendance_date");

      if (attendError) {
        throw attendError;
      }

      // ministry 정보 가져오기
      const { data: ministryData, error: ministryError } = await supabase
        .from("ministry")
        .select("id, name")
        .order("name");

      if (ministryError) {
        throw ministryError;
      }

      setMinistries(ministryData || []);

      // 출석부 데이터 정리
      const attendancesWithInfo = (data || []).map((attendance) => {
        return {
          ...attendance,
          memberName: attendance.member?.name || "알 수 없음",
          memberPhone: attendance.member?.phone || "",
          ministryName: attendance.ministry?.name || "알 수 없음",
        };
      });

      setAttendances(attendancesWithInfo);

      // 회원 목록 가져오기 (중복 제거)
      const uniqueMembers = Array.from(
        new Map(
          attendancesWithInfo.map((a) => [a.member_id, a.member])
        ).values()
      ).filter(Boolean);
      setMembers(uniqueMembers);
    } catch (err) {
      console.error("출석부 가져오기 오류:", err);
      setError(err.message || "출석부를 가져오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [monthStart, monthEnd]);

  // 출석부 데이터 가져오기
  useEffect(() => {
    fetchAttendances();
  }, [fetchAttendances]);

  // 부서별, 회원별, 날짜별, 라운드별로 그룹화
  const attendanceByMemberAndDate = useMemo(() => {
    const grouped = {};

    attendances.forEach((attendance) => {
      if (!selectedMinistry || attendance.ministryName === selectedMinistry) {
        const memberId = attendance.member_id;
        const dateKey = attendance.attendance_date;
        const round = attendance.round || "1";

        if (!grouped[memberId]) {
          grouped[memberId] = {
            member: attendance.member,
            memberName: attendance.memberName,
            dates: {},
          };
        }

        if (!grouped[memberId].dates[dateKey]) {
          grouped[memberId].dates[dateKey] = {};
        }

        if (!grouped[memberId].dates[dateKey][round]) {
          grouped[memberId].dates[dateKey][round] = [];
        }

        grouped[memberId].dates[dateKey][round].push(attendance);
      }
    });

    return grouped;
  }, [attendances, selectedMinistry]);

  // 통계 계산
  const statistics = useMemo(() => {
    const stats = {
      total: 0,
      출석: 0,
      결석: 0,
      지각: 0,
      미입력: 0,
    };

    attendances.forEach((attendance) => {
      if (!selectedMinistry || attendance.ministryName === selectedMinistry) {
        stats.total++;
        const status = attendance.status || "미입력";
        if (stats[status] !== undefined) {
          stats[status]++;
        } else {
          stats.미입력++;
        }
      }
    });

    return stats;
  }, [attendances, selectedMinistry]);

  // 날짜별, 라운드별 출석 상태 가져오기
  const getAttendanceStatusByRound = (memberId, date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    const memberData = attendanceByMemberAndDate[memberId];
    if (!memberData || !memberData.dates[dateKey]) {
      return {};
    }

    // 라운드별로 그룹화하여 반환
    const rounds = memberData.dates[dateKey];
    const result = {};
    Object.keys(rounds).forEach((round) => {
      const attendance = rounds[round][0];
      result[round] = attendance.status || null;
    });
    return result;
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div>로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 min-h-screen">
      <Card className="max-w-full mx-auto">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold">
              월별 출석부 현황
            </CardTitle>
            <Link
              to="/attend/calendar"
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/90 transition-colors text-sm sm:text-base"
            >
              달력으로
            </Link>
          </div>
          <div className="mt-4 flex items-center gap-4 flex-wrap">
            <div>
              <label className="block text-sm font-medium mb-2">월 선택</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                부서 선택
              </label>
              <select
                value={selectedMinistry || ""}
                onChange={(e) => setSelectedMinistry(e.target.value || null)}
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                <option value="">전체</option>
                {ministries.map((ministry) => (
                  <option key={ministry.id} value={ministry.name}>
                    {ministry.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchAttendances}
                disabled={loading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {loading ? "로딩 중..." : "새로고침"}
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {/* 통계 */}
          <div className="mb-6 grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="p-4 bg-muted rounded-lg text-center">
              <div className="text-2xl font-bold">{statistics.total}</div>
              <div className="text-sm text-muted-foreground">전체</div>
            </div>
            <div className="p-4 bg-green-100 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-800">
                {statistics.출석}
              </div>
              <div className="text-sm text-green-600">출석</div>
            </div>
            <div className="p-4 bg-red-100 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-800">
                {statistics.결석}
              </div>
              <div className="text-sm text-red-600">결석</div>
            </div>
            <div className="p-4 bg-yellow-100 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-800">
                {statistics.지각}
              </div>
              <div className="text-sm text-yellow-600">지각</div>
            </div>
            <div className="p-4 bg-gray-100 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-800">
                {statistics.미입력}
              </div>
              <div className="text-sm text-gray-600">미입력</div>
            </div>
          </div>

          {/* 출석 현황 표 */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted">
                  <th className="text-left p-2 font-semibold sticky left-0 bg-muted z-10">
                    이름
                  </th>
                  {monthDays.map((day) => (
                    <th
                      key={format(day, "yyyy-MM-dd")}
                      className="text-center p-2 font-semibold min-w-[40px]"
                    >
                      {format(day, "d")}
                    </th>
                  ))}
                  <th className="text-center p-2 font-semibold bg-muted">
                    출석
                  </th>
                  <th className="text-center p-2 font-semibold bg-muted">
                    결석
                  </th>
                  <th className="text-center p-2 font-semibold bg-muted">
                    지각
                  </th>
                  <th className="text-center p-2 font-semibold bg-muted">
                    합계
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(attendanceByMemberAndDate).map(
                  ([memberId, memberData]) => {
                    const memberStats = {
                      출석: 0,
                      결석: 0,
                      지각: 0,
                    };

                    monthDays.forEach((day) => {
                      const rounds = getAttendanceStatusByRound(memberId, day);
                      Object.values(rounds).forEach((status) => {
                        if (status && memberStats[status] !== undefined) {
                          memberStats[status]++;
                        }
                      });
                    });

                    const total =
                      memberStats.출석 + memberStats.결석 + memberStats.지각;

                    return (
                      <tr key={memberId} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium sticky left-0 bg-background z-10">
                          {memberData.memberName}
                        </td>
                        {monthDays.map((day) => {
                          const rounds = getAttendanceStatusByRound(
                            memberId,
                            day
                          );
                          const roundKeys = Object.keys(rounds).sort();

                          if (roundKeys.length === 0) {
                            return (
                              <td
                                key={format(day, "yyyy-MM-dd")}
                                className="text-center p-1"
                              ></td>
                            );
                          }

                          return (
                            <td
                              key={format(day, "yyyy-MM-dd")}
                              className="text-center p-1"
                            >
                              <div className="flex flex-col gap-0.5 items-center">
                                {roundKeys.map((round) => {
                                  const status = rounds[round];
                                  const bgColor =
                                    status === "출석"
                                      ? "bg-green-100"
                                      : status === "결석"
                                      ? "bg-red-100"
                                      : status === "지각"
                                      ? "bg-yellow-100"
                                      : "";
                                  const symbol =
                                    status === "출석"
                                      ? "○"
                                      : status === "결석"
                                      ? "×"
                                      : status === "지각"
                                      ? "△"
                                      : "";

                                  return (
                                    <div
                                      key={round}
                                      className={`${bgColor} rounded px-1 text-xs w-full`}
                                      title={`Round ${round}`}
                                    >
                                      <span className="text-[10px] text-gray-600">
                                        {round}
                                      </span>
                                      <span className="ml-0.5">{symbol}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                          );
                        })}
                        <td className="text-center p-2 font-semibold bg-green-50">
                          {memberStats.출석}
                        </td>
                        <td className="text-center p-2 font-semibold bg-red-50">
                          {memberStats.결석}
                        </td>
                        <td className="text-center p-2 font-semibold bg-yellow-50">
                          {memberStats.지각}
                        </td>
                        <td className="text-center p-2 font-semibold bg-muted">
                          {total}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>

          {Object.keys(attendanceByMemberAndDate).length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              {format(monthStart, "yyyy년 MM월", { locale: ko })}에 출석부
              데이터가 없습니다.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AttendView;
