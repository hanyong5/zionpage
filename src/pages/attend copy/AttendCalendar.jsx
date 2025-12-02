import React, { useMemo, useState } from "react";
import CustomCalendar from "@/components/ui/custom-calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ko } from "date-fns/locale/ko";
import holidaysData from "../../data/holidays.json";

function AttendCalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
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

  return (
    <div className="p-3 sm:p-4 md:p-6 min-h-screen">
      <Card className="max-w-full sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold text-center">
            출석용
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
              <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg text-center text-base sm:text-lg font-medium">
                {selectedHoliday}
              </div>
            ) : (
              <div className="p-4 bg-muted border rounded-lg text-center text-sm sm:text-base text-muted-foreground">
                등록된 공휴일이 없습니다.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AttendCalendar;
