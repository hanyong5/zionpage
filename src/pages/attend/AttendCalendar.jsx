import React, { useMemo, useState, useEffect } from "react";
import CustomCalendar from "@/components/ui/custom-calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ko } from "date-fns/locale/ko";
import holidaysData from "../../data/holidays.json";
import supabase from "../../utils/supabase";
import { Link } from "react-router-dom";

function AttendCalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [ministries, setMinistries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMinistry, setSelectedMinistry] = useState(null);
  const [availableRounds, setAvailableRounds] = useState({});
  const holidays = holidaysData ?? [];

  // 공휴일 날짜 배열
  const holidayDates = useMemo(() => {
    return holidays
      .map((holiday) => holiday?.holiday_date || holiday?.date)
      .filter(Boolean)
      .map((dateString) => {
        const date = new Date(dateString);
        date.setHours(0, 0, 0, 0);
        return date;
      });
  }, [holidays]);

  // 공휴일 이름 맵
  const holidayNames = useMemo(() => {
    const names = {};
    holidays.forEach((holiday) => {
      const dateString = holiday?.holiday_date || holiday?.date;
      if (!dateString) return;
      const date = new Date(dateString);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(date.getDate()).padStart(2, "0")}`;
      names[key] = holiday.name || holiday.holiday_name;
    });
    return names;
  }, [holidays]);

  // 선택한 날짜의 공휴일 정보
  const selectedHoliday = useMemo(() => {
    if (!selectedDate) return null;
    const key = `${selectedDate.getFullYear()}-${String(
      selectedDate.getMonth() + 1
    ).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
    return holidayNames[key] || null;
  }, [selectedDate, holidayNames]);

  // ministry 목록 가져오기
  useEffect(() => {
    const fetchMinistries = async () => {
      try {
        const { data, error } = await supabase
          .from("ministry")
          .select("id, name")
          .order("name");

        if (error) {
          console.error("소속 목록 가져오기 오류:", error);
          setError(error.message);
          return;
        }

        if (data) {
          setMinistries(data);
        }
      } catch (err) {
        console.error("소속 목록 가져오기 중 오류:", err);
        setError(err.message);
      }
    };

    fetchMinistries();
  }, []);

  // 부서 선택 시 사용 가능한 round 확인
  const handleMinistrySelect = async (ministryId, ministryName) => {
    if (!selectedDate) return;

    setError(null);
    const dateString = format(selectedDate, "yyyy-MM-dd");

    try {
      // 해당 날짜와 ministry_id로 이미 생성된 round 확인
      const { data: existing, error: checkError } = await supabase
        .from("attend")
        .select("round")
        .eq("attendance_date", dateString)
        .eq("ministry_id", ministryId);

      if (checkError) {
        throw checkError;
      }

      // 사용된 round 목록
      const usedRounds = new Set(
        (existing || []).map((e) => e.round).filter(Boolean)
      );

      // 사용 가능한 round (1, 2, 3 중 사용되지 않은 것)
      const available = [1, 2, 3].filter((r) => !usedRounds.has(r.toString()));

      if (available.length === 0) {
        setError(
          `${ministryName}의 ${dateString} 출석부는 이미 3개 모두 생성되었습니다.`
        );
        return;
      }

      setSelectedMinistry({ id: ministryId, name: ministryName });
      setAvailableRounds((prev) => ({
        ...prev,
        [ministryId]: available,
      }));
    } catch (err) {
      setError(err.message || "출석부 확인 중 오류가 발생했습니다.");
    }
  };

  // 출석부 생성 핸들러
  const handleCreateAttendance = async (ministryId, ministryName, round) => {
    if (!selectedDate) return;

    setLoading(true);
    setError(null);

    try {
      // 날짜를 YYYY-MM-DD 형식으로 변환
      const dateString = format(selectedDate, "yyyy-MM-dd");
      const currentYear = new Date().getFullYear();

      // 해당 날짜, ministry_id, round로 이미 출석부가 있는지 확인
      const { data: existing, error: checkError } = await supabase
        .from("attend")
        .select("id")
        .eq("attendance_date", dateString)
        .eq("ministry_id", ministryId)
        .eq("round", round.toString())
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existing) {
        setError(
          `${ministryName}의 ${dateString} Round ${round} 출석부가 이미 존재합니다.`
        );
        setLoading(false);
        return;
      }

      // 해당 ministry에 속한 현재 년도의 활성 회원들 조회
      const { data: membershipData, error: membershipError } = await supabase
        .from("membership")
        .select("member_id")
        .eq("ministry_id", ministryId)
        .eq("is_active", true)
        .eq("year", currentYear)
        .order("member_id");

      if (membershipError) {
        throw membershipError;
      }

      if (!membershipData || membershipData.length === 0) {
        setError(`${ministryName}에 활성 회원이 없습니다.`);
        setLoading(false);
        return;
      }

      // 각 회원에 대해 출석 레코드 생성
      const attendRecords = membershipData.map((membership) => ({
        attendance_date: dateString,
        ministry_id: ministryId,
        member_id: membership.member_id,
        round: round.toString(), // 선택한 round
        status: "결석", // 기본값은 결석
        memo: null,
      }));

      const { error: insertError } = await supabase
        .from("attend")
        .insert(attendRecords);

      if (insertError) {
        throw insertError;
      }

      // 성공 메시지 및 리스트 페이지로 이동
      alert(
        `${ministryName}의 ${dateString} Round ${round} 출석부가 생성되었습니다. (${membershipData.length}명)`
      );

      // 선택 초기화
      setSelectedMinistry(null);
      setAvailableRounds({});

      // 출석부 리스트 페이지로 이동
      window.location.href = `/attend/list?date=${dateString}`;
    } catch (err) {
      setError(err.message || "출석부 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 min-h-screen">
      <Card className="max-w-full sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold text-center">
            출석부
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center w-full">
            <div className="w-full max-w-full">
              <CustomCalendar
                currentDate={selectedDate}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                holidayDates={holidayDates}
                holidayNames={holidayNames}
                eventDates={[]}
                eventsByDate={{}}
                songsByDate={{}}
                className="w-full"
              />
            </div>
          </div>

          <div className="mt-6 border-t pt-4">
            <h3 className="text-lg sm:text-xl font-semibold mb-3 text-center">
              {format(selectedDate, "yyyy년 MM월 dd일 (EEE)", { locale: ko })}
            </h3>

            {selectedHoliday ? (
              <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg text-center text-base sm:text-lg font-medium mb-4">
                {selectedHoliday}
              </div>
            ) : (
              <div className="p-4 bg-muted border rounded-lg text-center text-sm sm:text-base text-muted-foreground mb-4">
                등록된 공휴일이 없습니다.
              </div>
            )}

            {/* 부서별 출석 버튼 */}
            <div className="mb-4">
              <h4 className="text-base sm:text-lg font-semibold mb-3">
                부서별 출석부 생성 (하루 최대 3개, Round 1, 2, 3)
              </h4>
              {error && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-lg mb-3 text-sm">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {ministries.map((ministry) => (
                  <div key={ministry.id} className="space-y-2">
                    <button
                      onClick={() =>
                        handleMinistrySelect(ministry.id, ministry.name)
                      }
                      disabled={loading}
                      className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      {ministry.name}
                    </button>
                    {selectedMinistry?.id === ministry.id &&
                      availableRounds[ministry.id] && (
                        <div className="flex gap-1">
                          {availableRounds[ministry.id].map((round) => (
                            <button
                              key={round}
                              onClick={() =>
                                handleCreateAttendance(
                                  ministry.id,
                                  ministry.name,
                                  round
                                )
                              }
                              disabled={loading}
                              className="flex-1 px-2 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              R{round}
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                ))}
              </div>
            </div>

            {/* 출석부 리스트 링크 */}
            <div className="mt-4 pt-4 border-t">
              <Link
                to={`/attend/list?date=${format(selectedDate, "yyyy-MM-dd")}`}
                className="block w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/90 transition-colors text-center"
              >
                {format(selectedDate, "yyyy년 MM월 dd일", { locale: ko })}{" "}
                출석부 리스트 보기
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AttendCalendar;
