import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function CustomCalendar({
  currentDate,
  selectedDate,
  onDateSelect,
  eventDates = [],
  eventsByDate = {},
  holidayDates = [],
  holidayNames = {},
  songsByDate = {},
  className,
}) {
  const [viewDate, setViewDate] = React.useState(
    currentDate || new Date()
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 현재 보는 월의 첫 날과 마지막 날
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  // 이전 달의 마지막 날들
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const prevMonthDays = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    prevMonthDays.push(prevMonthLastDay - i);
  }

  // 현재 달의 날들
  const currentMonthDays = [];
  for (let i = 1; i <= daysInMonth; i++) {
    currentMonthDays.push(i);
  }

  // 다음 달의 날들 (달력을 채우기 위해)
  const totalCells = prevMonthDays.length + currentMonthDays.length;
  const nextMonthDays = [];
  const remainingCells = 42 - totalCells; // 6주 x 7일 = 42
  for (let i = 1; i <= remainingCells; i++) {
    nextMonthDays.push(i);
  }

  // 날짜가 같은지 확인
  const isSameDate = (date1, date2) => {
    if (!date1 || !date2) return false;
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  // 날짜에 행사일정이 있는지 확인
  const hasEvent = (day, isCurrentMonth) => {
    if (!isCurrentMonth) return false;
    const checkDate = new Date(year, month, day);
    return eventDates.some((eventDate) => {
      const event = new Date(eventDate);
      return isSameDate(checkDate, event);
    });
  };

  // 날짜의 일정 목록 가져오기
  const getEventsForDate = (day, isCurrentMonth, isPrevMonth) => {
    let checkDate;
    if (isPrevMonth) {
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      checkDate = new Date(prevYear, prevMonth, day);
    } else if (isCurrentMonth) {
      checkDate = new Date(year, month, day);
    } else {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      checkDate = new Date(nextYear, nextMonth, day);
    }
    checkDate.setHours(0, 0, 0, 0);
    const dateKey = `${checkDate.getFullYear()}-${String(
      checkDate.getMonth() + 1
    ).padStart(2, "0")}-${String(checkDate.getDate()).padStart(2, "0")}`;
    return eventsByDate[dateKey] || [];
  };

  // 날짜의 찬양 목록 가져오기
  const getSongsForDate = (day, isCurrentMonth, isPrevMonth) => {
    let checkDate;
    if (isPrevMonth) {
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      checkDate = new Date(prevYear, prevMonth, day);
    } else if (isCurrentMonth) {
      checkDate = new Date(year, month, day);
    } else {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      checkDate = new Date(nextYear, nextMonth, day);
    }
    checkDate.setHours(0, 0, 0, 0);
    const dateKey = `${checkDate.getFullYear()}-${String(
      checkDate.getMonth() + 1
    ).padStart(2, "0")}-${String(checkDate.getDate()).padStart(2, "0")}`;
    return songsByDate[dateKey] || [];
  };

  // 날짜가 공휴일인지 확인
  const isHoliday = (day, isCurrentMonth, isPrevMonth) => {
    let checkDate;
    if (isPrevMonth) {
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      checkDate = new Date(prevYear, prevMonth, day);
    } else if (isCurrentMonth) {
      checkDate = new Date(year, month, day);
    } else {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      checkDate = new Date(nextYear, nextMonth, day);
    }
    checkDate.setHours(0, 0, 0, 0);
    return holidayDates.some((holidayDate) => {
      const holiday = new Date(holidayDate);
      return isSameDate(checkDate, holiday);
    });
  };

  // 공휴일 이름 가져오기
  const getHolidayName = (day, isCurrentMonth, isPrevMonth) => {
    let checkDate;
    if (isPrevMonth) {
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      checkDate = new Date(prevYear, prevMonth, day);
    } else if (isCurrentMonth) {
      checkDate = new Date(year, month, day);
    } else {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      checkDate = new Date(nextYear, nextMonth, day);
    }
    checkDate.setHours(0, 0, 0, 0);
    const dateKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
    return holidayNames[dateKey] || null;
  };

  // 날짜 클릭 핸들러
  const handleDateClick = (day, isCurrentMonth, isPrevMonth) => {
    let clickDate;
    if (isPrevMonth) {
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      clickDate = new Date(prevYear, prevMonth, day);
    } else if (isCurrentMonth) {
      clickDate = new Date(year, month, day);
    } else {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      clickDate = new Date(nextYear, nextMonth, day);
    }
    clickDate.setHours(0, 0, 0, 0);
    if (onDateSelect) {
      onDateSelect(clickDate);
    }
  };

  // 이전 달로 이동
  const goToPreviousMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  // 다음 달로 이동
  const goToNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  // 오늘로 이동
  const goToToday = () => {
    const todayDate = new Date();
    setViewDate(todayDate);
    if (onDateSelect) {
      onDateSelect(todayDate);
    }
  };

  return (
    <div className={cn("rounded-md border p-3 sm:p-4 md:p-6 bg-card w-full", className)}>
      {/* 헤더 - 월/년 표시 및 네비게이션 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPreviousMonth}
          className="h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-md hover:bg-accent transition-colors"
          aria-label="이전 달"
        >
          <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold">
            {year}년 {month + 1}월
          </h2>
          <button
            onClick={goToToday}
            className="text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-md hover:bg-accent transition-colors"
          >
            오늘
          </button>
        </div>
        <button
          onClick={goToNextMonth}
          className="h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-md hover:bg-accent transition-colors"
          aria-label="다음 달"
        >
          <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((day, index) => (
          <div
            key={day}
            className={cn(
              "text-center text-xs sm:text-sm font-medium py-2",
              index === 0 && "text-red-500",
              index === 6 && "text-blue-500"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-1 auto-rows-fr w-full">
        {/* 이전 달 날짜들 */}
        {prevMonthDays.map((day) => {
          const clickDate = new Date(
            month === 0 ? year - 1 : year,
            month === 0 ? 11 : month - 1,
            day
          );
          const isSelected = selectedDate && isSameDate(clickDate, selectedDate);
          const isHolidayDay = isHoliday(day, false, true);
          const holidayName = getHolidayName(day, false, true);
          const dayEvents = getEventsForDate(day, false, true);
          const daySongs = getSongsForDate(day, false, true);
          return (
            <div
              key={`prev-${day}`}
              className={cn(
                "min-h-[4rem] sm:min-h-[5rem] md:min-h-[6rem] lg:min-h-[7rem] xl:min-h-[8rem] flex flex-col rounded-md border border-border/50 overflow-hidden opacity-50",
                isSelected && "border-primary border-2"
              )}
            >
              <button
                onClick={() => handleDateClick(day, false, true)}
                className={cn(
                  "flex-shrink-0 h-8 w-full sm:h-10 md:h-12 flex items-center justify-center text-xs sm:text-sm md:text-base relative",
                  "text-muted-foreground hover:bg-accent/50 transition-colors",
                  isSelected && "bg-primary/20",
                  isHolidayDay && "text-red-500"
                )}
                title={holidayName || undefined}
              >
                <span>{day}</span>
                {holidayName && (
                  <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
                )}
              </button>
              <div className="flex-1 p-0.5 sm:p-1 overflow-hidden flex flex-col">
                {/* 공휴일과 일정 표시 */}
                {(() => {
                  const eventItems = [];
                  // 공휴일 추가
                  if (holidayName) {
                    eventItems.push({ type: "holiday", name: holidayName });
                  }
                  // 일정 추가
                  dayEvents.forEach((event) => {
                    eventItems.push({ type: "event", name: event.title });
                  });

                  return (
                    <>
                      {eventItems.slice(0, 2).map((item, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "text-[8px] sm:text-[10px] md:text-xs px-1 py-0.5 mb-0.5 rounded truncate font-medium",
                            item.type === "holiday"
                              ? "bg-red-500/20 text-red-600"
                              : "bg-blue-500/20 text-blue-700"
                          )}
                          title={item.name}
                        >
                          {item.name}
                        </div>
                      ))}
                    </>
                  );
                })()}
                
                {/* 찬양 표시 (3칸 정도 크기) */}
                {daySongs.length > 0 && (
                  <div className="flex-1 flex flex-col justify-start mt-1">
                    {daySongs.slice(0, 3).map((song, idx) => (
                      <div
                        key={song.id || idx}
                        className={cn(
                          "px-1.5 py-1 mb-1 rounded font-semibold break-words",
                          "text-[10px] sm:text-xs md:text-sm",
                          "bg-green-500/25 text-green-800",
                          "min-h-[2rem] flex items-center"
                        )}
                        title={song.title || "제목 없음"}
                      >
                        <span className="line-clamp-2 leading-tight">
                          {song.title || "제목 없음"}
                        </span>
                      </div>
                    ))}
                    {daySongs.length > 3 && (
                      <div className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded font-medium bg-green-500/20 text-green-700">
                        +{daySongs.length - 3}개
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* 현재 달 날짜들 */}
        {currentMonthDays.map((day) => {
          const date = new Date(year, month, day);
          date.setHours(0, 0, 0, 0);
          const isToday = isSameDate(date, today);
          const isSelected = selectedDate && isSameDate(date, selectedDate);
          const hasEventOnDay = hasEvent(day, true);
          const isHolidayDay = isHoliday(day, true, false);
          const holidayName = getHolidayName(day, true, false);
          const dayEvents = getEventsForDate(day, true, false);
          const daySongs = getSongsForDate(day, true, false);

          return (
            <div
              key={day}
              className={cn(
                "min-h-[4rem] sm:min-h-[5rem] md:min-h-[6rem] lg:min-h-[7rem] xl:min-h-[8rem] flex flex-col rounded-md border border-border/50 overflow-hidden",
                isSelected && "border-primary border-2"
              )}
            >
              <button
                onClick={() => handleDateClick(day, true, false)}
                className={cn(
                  "flex-shrink-0 h-8 w-full sm:h-10 md:h-12 flex items-center justify-center text-xs sm:text-sm md:text-base relative transition-colors",
                  "hover:bg-accent",
                  isToday && !isSelected && "bg-accent font-bold",
                  isSelected &&
                    "bg-primary text-primary-foreground hover:bg-primary/90 font-semibold",
                  !isSelected && !isToday && "hover:bg-accent",
                  isHolidayDay && !isSelected && "text-red-500 font-semibold"
                )}
                title={holidayName || undefined}
              >
                <span>{day}</span>
                {hasEventOnDay && (
                  <span
                    className={cn(
                      "absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full",
                      isSelected ? "bg-blue-200" : "bg-blue-500"
                    )}
                  />
                )}
                {holidayName && !hasEventOnDay && (
                  <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
                )}
              </button>
              {/* 일정 및 공휴일 내용 표시 */}
              <div className="flex-1 p-0.5 sm:p-1 overflow-hidden flex flex-col">
                {/* 공휴일과 일정 표시 */}
                {(() => {
                  const eventItems = [];
                  // 공휴일 추가
                  if (holidayName) {
                    eventItems.push({ type: "holiday", name: holidayName });
                  }
                  // 일정 추가
                  dayEvents.forEach((event) => {
                    eventItems.push({ type: "event", name: event.title });
                  });

                  return (
                    <>
                      {eventItems.slice(0, 2).map((item, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "text-[8px] sm:text-[10px] md:text-xs px-1 py-0.5 mb-0.5 rounded truncate font-medium",
                            item.type === "holiday"
                              ? isSelected
                                ? "bg-red-500/30 text-red-200"
                                : "bg-red-500/20 text-red-600"
                              : isSelected
                              ? "bg-blue-500/30 text-blue-200"
                              : "bg-blue-500/20 text-blue-700"
                          )}
                          title={item.name}
                        >
                          {item.name}
                        </div>
                      ))}
                    </>
                  );
                })()}
                
                {/* 찬양 표시 (3칸 정도 크기) */}
                {daySongs.length > 0 && (
                  <div className="flex-1 flex flex-col justify-start mt-1">
                    {daySongs.slice(0, 3).map((song, idx) => (
                      <div
                        key={song.id || idx}
                        className={cn(
                          "px-1.5 py-1 mb-1 rounded font-semibold break-words",
                          "text-[10px] sm:text-xs md:text-sm",
                          isSelected
                            ? "bg-green-500/30 text-green-100"
                            : "bg-green-500/25 text-green-800",
                          "min-h-[2rem] flex items-center"
                        )}
                        title={song.title || "제목 없음"}
                      >
                        <span className="line-clamp-2 leading-tight">
                          {song.title || "제목 없음"}
                        </span>
                      </div>
                    ))}
                    {daySongs.length > 3 && (
                      <div
                        className={cn(
                          "text-[10px] sm:text-xs px-1.5 py-0.5 rounded font-medium",
                          isSelected
                            ? "bg-green-500/30 text-green-200"
                            : "bg-green-500/20 text-green-700"
                        )}
                      >
                        +{daySongs.length - 3}개
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* 다음 달 날짜들 */}
        {nextMonthDays.map((day) => {
          const clickDate = new Date(
            month === 11 ? year + 1 : year,
            month === 11 ? 0 : month + 1,
            day
          );
          const isSelected = selectedDate && isSameDate(clickDate, selectedDate);
          const isHolidayDay = isHoliday(day, false, false);
          const holidayName = getHolidayName(day, false, false);
          const dayEvents = getEventsForDate(day, false, false);
          const daySongs = getSongsForDate(day, false, false);
          return (
            <div
              key={`next-${day}`}
              className={cn(
                "min-h-[4rem] sm:min-h-[5rem] md:min-h-[6rem] lg:min-h-[7rem] xl:min-h-[8rem] flex flex-col rounded-md border border-border/50 overflow-hidden opacity-50",
                isSelected && "border-primary border-2"
              )}
            >
              <button
                onClick={() => handleDateClick(day, false, false)}
                className={cn(
                  "flex-shrink-0 h-8 w-full sm:h-10 md:h-12 flex items-center justify-center text-xs sm:text-sm md:text-base relative",
                  "text-muted-foreground hover:bg-accent/50 transition-colors",
                  isSelected && "bg-primary/20",
                  isHolidayDay && "text-red-500"
                )}
                title={holidayName || undefined}
              >
                <span>{day}</span>
                {holidayName && (
                  <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
                )}
              </button>
              <div className="flex-1 p-0.5 sm:p-1 overflow-hidden flex flex-col">
                {/* 공휴일과 일정 표시 */}
                {(() => {
                  const eventItems = [];
                  // 공휴일 추가
                  if (holidayName) {
                    eventItems.push({ type: "holiday", name: holidayName });
                  }
                  // 일정 추가
                  dayEvents.forEach((event) => {
                    eventItems.push({ type: "event", name: event.title });
                  });

                  return (
                    <>
                      {eventItems.slice(0, 2).map((item, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "text-[8px] sm:text-[10px] md:text-xs px-1 py-0.5 mb-0.5 rounded truncate font-medium",
                            item.type === "holiday"
                              ? "bg-red-500/20 text-red-600"
                              : "bg-blue-500/20 text-blue-700"
                          )}
                          title={item.name}
                        >
                          {item.name}
                        </div>
                      ))}
                    </>
                  );
                })()}
                
                {/* 찬양 표시 (3칸 정도 크기) */}
                {daySongs.length > 0 && (
                  <div className="flex-1 flex flex-col justify-start mt-1">
                    {daySongs.slice(0, 3).map((song, idx) => (
                      <div
                        key={song.id || idx}
                        className={cn(
                          "px-1.5 py-1 mb-1 rounded font-semibold break-words",
                          "text-[10px] sm:text-xs md:text-sm",
                          "bg-green-500/25 text-green-800",
                          "min-h-[2rem] flex items-center"
                        )}
                        title={song.title || "제목 없음"}
                      >
                        <span className="line-clamp-2 leading-tight">
                          {song.title || "제목 없음"}
                        </span>
                      </div>
                    ))}
                    {daySongs.length > 3 && (
                      <div className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded font-medium bg-green-500/20 text-green-700">
                        +{daySongs.length - 3}개
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CustomCalendar;

