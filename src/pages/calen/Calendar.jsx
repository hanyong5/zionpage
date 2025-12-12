import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import CustomCalendar from "@/components/ui/custom-calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, isSameDay } from "date-fns";
import { ko } from "date-fns/locale/ko";
import { useCalen } from "../context/CalenContext";
import { Link } from "react-router-dom";
import supabase from "../../utils/supabase";

function Calendar() {
  const [searchParams] = useSearchParams();
  const [date, setDate] = useState(new Date());
  const { events, holidays, songs, loading } = useCalen();
  const [activeTabs, setActiveTabs] = useState({}); // 각 찬양별 탭 상태 관리
  const [ministryId, setMinistryId] = useState(null);
  const [birthdays, setBirthdays] = useState([]); // 생일자 데이터

  // URL 쿼리 파라미터에서 code 가져오기
  const code = searchParams.get("code");

  // code가 있으면 ministry 테이블에서 ministry_id 조회
  useEffect(() => {
    const fetchMinistryId = async () => {
      if (!code) {
        setMinistryId(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("ministry")
          .select("id")
          .eq("name", code)
          .single();

        if (error) {
          console.error("소속 조회 오류:", error);
          setMinistryId(null);
          return;
        }

        if (data) {
          setMinistryId(data.id);
        } else {
          setMinistryId(null);
        }
      } catch (err) {
        console.error("소속 조회 중 오류:", err);
        setMinistryId(null);
      }
    };

    fetchMinistryId();
  }, [code]);

  // 생일자 데이터 가져오기 (code에 따라 필터링)
  useEffect(() => {
    const fetchBirthdays = async () => {
      try {
        let query = supabase.from("members").select("id, name, birth");

        // code가 있고 ministryId가 있으면 필터링
        if (code && ministryId) {
          // membership 테이블을 통해 ministry_id로 필터링
          const { data: membershipData, error: membershipError } =
            await supabase
              .from("membership")
              .select("member_id")
              .eq("ministry_id", ministryId)
              .eq("is_active", true);

          if (membershipError) {
            console.error("멤버십 조회 오류:", membershipError);
            setBirthdays([]);
            return;
          }

          if (membershipData && membershipData.length > 0) {
            const memberIds = membershipData.map((m) => m.member_id);
            query = query.in("id", memberIds);
          } else {
            setBirthdays([]);
            return;
          }
        }

        const { data, error } = await query;

        if (error) {
          console.error("생일자 조회 오류:", error);
          setBirthdays([]);
          return;
        }

        // birth 필드가 있는 멤버만 필터링
        const membersWithBirth = (data || []).filter((member) => member.birth);
        setBirthdays(membersWithBirth);
      } catch (err) {
        console.error("생일자 조회 중 오류:", err);
        setBirthdays([]);
      }
    };

    // code가 있고 ministryId가 있을 때만 조회 (code가 없으면 전체 조회)
    if (!code || ministryId !== null) {
      fetchBirthdays();
    }
  }, [code, ministryId]);

  // 선택한 날짜의 행사일정 가져오기
  const selectedDateEvents = useMemo(() => {
    if (!date) return [];
    return events.filter((event) => {
      const eventDate = new Date(event.event_date);
      return isSameDay(eventDate, date);
    });
  }, [date, events]);

  // 행사일정이 있는 날짜들
  const eventDates = useMemo(() => {
    return events.map((event) => {
      const eventDate = new Date(event.event_date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate;
    });
  }, [events]);

  // 날짜별 일정 맵 (날짜를 키로 사용)
  const eventsByDate = useMemo(() => {
    const eventsMap = {};
    events.forEach((event) => {
      const eventDate = new Date(event.event_date);
      eventDate.setHours(0, 0, 0, 0);
      const dateKey = `${eventDate.getFullYear()}-${String(
        eventDate.getMonth() + 1
      ).padStart(2, "0")}-${String(eventDate.getDate()).padStart(2, "0")}`;
      if (!eventsMap[dateKey]) {
        eventsMap[dateKey] = [];
      }
      eventsMap[dateKey].push(event);
    });
    return eventsMap;
  }, [events]);

  // 공휴일 날짜들
  const holidayDates = useMemo(() => {
    return holidays.map((holiday) => {
      const holidayDate = new Date(holiday.holiday_date);
      holidayDate.setHours(0, 0, 0, 0);
      return holidayDate;
    });
  }, [holidays]);

  // 공휴일 이름 맵 (날짜를 키로 사용)
  const holidayNames = useMemo(() => {
    const namesMap = {};
    holidays.forEach((holiday) => {
      const holidayDate = new Date(holiday.holiday_date);
      const dateKey = `${holidayDate.getFullYear()}-${String(
        holidayDate.getMonth() + 1
      ).padStart(2, "0")}-${String(holidayDate.getDate()).padStart(2, "0")}`;
      namesMap[dateKey] = holiday.name || holiday.holiday_name;
    });
    return namesMap;
  }, [holidays]);

  // code에 따라 songs 필터링
  const filteredSongs = useMemo(() => {
    if (!code || !ministryId) {
      return songs;
    }
    // ministry_id가 일치하는 경우만 필터링
    return songs.filter((song) => song.ministry_id === ministryId);
  }, [songs, code, ministryId]);

  // 선택한 날짜의 찬양 가져오기
  const selectedDateSongs = useMemo(() => {
    if (!date) return [];
    return filteredSongs.filter((song) => {
      if (!song.singdate) return false;
      const songDate = new Date(song.singdate);
      return isSameDay(songDate, date);
    });
  }, [date, filteredSongs]);

  // 날짜별 찬양 맵 (날짜를 키로 사용)
  const songsByDate = useMemo(() => {
    const songsMap = {};
    filteredSongs.forEach((song) => {
      if (!song.singdate) return;
      const songDate = new Date(song.singdate);
      songDate.setHours(0, 0, 0, 0);
      const dateKey = `${songDate.getFullYear()}-${String(
        songDate.getMonth() + 1
      ).padStart(2, "0")}-${String(songDate.getDate()).padStart(2, "0")}`;
      if (!songsMap[dateKey]) {
        songsMap[dateKey] = [];
      }
      songsMap[dateKey].push(song);
    });
    return songsMap;
  }, [filteredSongs]);

  // 생일자를 날짜별로 매핑 (월/일 기준, 매년 반복)
  const birthdaysByDate = useMemo(() => {
    const birthdaysMap = {};
    birthdays.forEach((member) => {
      if (!member.birth) return;
      const birthDate = new Date(member.birth);
      const month = birthDate.getMonth() + 1;
      const day = birthDate.getDate();
      // MM-DD 형식의 키 사용 (매년 반복)
      const dateKey = `${String(month).padStart(2, "0")}-${String(day).padStart(
        2,
        "0"
      )}`;
      if (!birthdaysMap[dateKey]) {
        birthdaysMap[dateKey] = [];
      }
      birthdaysMap[dateKey].push(member);
    });
    return birthdaysMap;
  }, [birthdays]);

  // 선택한 날짜의 생일자 가져오기
  const selectedDateBirthdays = useMemo(() => {
    if (!date) return [];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dateKey = `${String(month).padStart(2, "0")}-${String(day).padStart(
      2,
      "0"
    )}`;
    return birthdaysByDate[dateKey] || [];
  }, [date, birthdaysByDate]);

  return (
    <div className="p-3 sm:p-4 md:p-6 min-h-screen">
      <Card className="max-w-full sm:max-w-2xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-full mx-auto">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold text-center">
            {`${code}`} 일정
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* 선택한 날짜 정보 */}

          {/* 커스텀 달력 - 반응형 크기 (화면에 자동 맞춤) */}
          <div className="flex justify-center w-full">
            <div className="w-full max-w-full">
              <CustomCalendar
                currentDate={date}
                selectedDate={date}
                onDateSelect={setDate}
                eventDates={eventDates}
                eventsByDate={eventsByDate}
                holidayDates={holidayDates}
                holidayNames={holidayNames}
                songsByDate={songsByDate}
                birthdaysByDate={birthdaysByDate}
                className="w-full"
              />
            </div>
          </div>

          {/* 선택한 날짜의 행사일정 목록 */}
          {selectedDateEvents.length > 0 && (
            <div className="mt-4 sm:mt-6 md:mt-8 border-t pt-4 sm:pt-6">
              <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
                {format(date, "yyyy년 MM월 dd일", { locale: ko })} 행사일정
              </h3>
              <div className="space-y-2 sm:space-y-3">
                {selectedDateEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-3 sm:p-4 bg-accent rounded-lg border-l-4 border-primary"
                  >
                    <div className="font-semibold text-lg sm:text-xl md:text-2xl">
                      {event.title}
                    </div>
                    {event.description && (
                      <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                        {event.description}
                      </div>
                    )}
                    {event.location && (
                      <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                        장소: {event.location}
                      </div>
                    )}
                    {event.time && (
                      <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                        시간: {event.time}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 선택한 날짜의 생일자 표시 */}
          {selectedDateBirthdays.length > 0 && (
            <div className="mt-4 sm:mt-6 md:mt-8 border-t pt-4 sm:pt-6">
              <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
                {format(date, "yyyy년 MM월 dd일", { locale: ko })} 생일자
              </h3>
              <div className="space-y-2 sm:space-y-3">
                {selectedDateBirthdays.map((member) => (
                  <div
                    key={member.id}
                    className="p-3 sm:p-4 bg-pink-50 dark:bg-pink-900/20 rounded-lg border-l-4 border-pink-500"
                  >
                    <div className="font-semibold text-lg sm:text-xl md:text-2xl text-pink-700 dark:text-pink-300">
                      🎂 {member.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedDateEvents.length === 0 &&
            selectedDateSongs.length === 0 &&
            selectedDateBirthdays.length === 0 &&
            date && (
              <div className="mt-4 sm:mt-6 md:mt-8 border-t pt-4 sm:pt-6 text-center text-sm sm:text-base text-muted-foreground">
                선택한 날짜에 행사일정이 없습니다.
              </div>
            )}

          {/* 선택한 날짜의 찬양 표시 */}
          {selectedDateSongs.length > 0 && (
            <div className="mt-4 sm:mt-6 md:mt-8 border-t pt-4 sm:pt-6 p-6">
              <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-4 sm:mb-6">
                {format(date, "yyyy년 MM월 dd일", { locale: ko })}
                {/* "시온" 또는 "예루살롐" 성가대(ministry_id === 2 또는 1)의 경우 "찬양"이 아니라 "일정"으로 제목을 변경 */}
                {ministryId === 2 || ministryId === 1 ? "찬양" : "일정"}
              </h3>
              <div className="space-y-4">
                {selectedDateSongs.map((song) => {
                  // type이 "one"인 경우
                  if (song.type === "one") {
                    return (
                      <div
                        key={song.id}
                        className="border rounded-lg p-4 bg-card"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-lg sm:text-xl md:text-2xl">
                            {song.title || "제목 없음"}
                          </h4>
                          <Link
                            to={`/calen/view/${song.id}`}
                            className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                          >
                            전체보기
                          </Link>
                        </div>
                        {song.link ? (
                          <div className="w-full h-[400px] sm:h-[500px] md:h-[600px] border rounded-lg overflow-hidden">
                            <iframe
                              src={song.link}
                              className="w-full h-full"
                              title={song.title || "찬양 보기"}
                              allowFullScreen
                            />
                          </div>
                        ) : (
                          <div className="text-center text-muted-foreground py-8">
                            링크가 없습니다.
                          </div>
                        )}
                      </div>
                    );
                  }

                  // type이 "four"인 경우
                  if (song.type === "four") {
                    const tabs = [
                      { id: "all", label: "ALL", link: song.alllink },
                      { id: "s", label: "SOPRANO", link: song.slink },
                      { id: "a", label: "ALTO", link: song.alink },
                      { id: "t", label: "TENOR", link: song.tlink },
                      { id: "b", label: "BASS", link: song.blink },
                    ].filter((tab) => tab.link);

                    // 각 찬양마다 독립적인 탭 상태를 관리
                    const currentSongTab =
                      activeTabs[song.id] || tabs[0]?.id || "all";

                    const currentTab = tabs.find(
                      (tab) => tab.id === currentSongTab
                    );
                    const currentLink = currentTab?.link;

                    return (
                      <div
                        key={song.id}
                        className="border rounded-lg p-4 bg-card"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-lg sm:text-xl md:text-2xl">
                            {song.title || "제목 없음"}
                          </h4>
                          <Link
                            to={`/calen/view/${song.id}`}
                            className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                          >
                            전체보기
                          </Link>
                        </div>

                        {/* 탭 메뉴 */}
                        {tabs.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {tabs.map((tab) => (
                              <button
                                key={tab.id}
                                onClick={() =>
                                  setActiveTabs((prev) => ({
                                    ...prev,
                                    [song.id]: tab.id,
                                  }))
                                }
                                className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                                  currentSongTab === tab.id
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted hover:bg-accent"
                                }`}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* iframe 표시 */}
                        {currentLink ? (
                          <div className="w-full h-[400px] sm:h-[500px] md:h-[600px] border rounded-lg overflow-hidden">
                            <iframe
                              src={currentLink}
                              className="w-full h-full"
                              title={`${song.title} - ${currentTab?.label}`}
                              allowFullScreen
                            />
                          </div>
                        ) : (
                          <div className="text-center text-muted-foreground py-8">
                            선택한 탭에 링크가 없습니다.
                          </div>
                        )}
                      </div>
                    );
                  }

                  // type이 "text"인 경우
                  if (song.type === "text" && song.text) {
                    return (
                      <div
                        key={song.id}
                        className="border rounded-lg p-4 bg-card"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-lg sm:text-xl md:text-2xl">
                            {song.title || "제목 없음"}
                          </h4>
                          <Link
                            to={`/calen/view/${song.id}`}
                            className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                          >
                            전체보기
                          </Link>
                        </div>
                        <div className="mt-4 p-4 bg-muted/50 rounded-lg whitespace-pre-wrap text-sm sm:text-base">
                          {song.text}
                        </div>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            </div>
          )}

          {loading && (
            <div className="text-center text-muted-foreground">로딩 중...</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default Calendar;
