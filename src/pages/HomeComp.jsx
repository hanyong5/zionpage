import React, { useState, useEffect } from "react";
import SelectorComp from "./selector/SelectorComp";
import { Button } from "@/components/ui/button";
import supabase from "../utils/supabase";
import { format, addDays, startOfDay, endOfDay } from "date-fns";
import { ko } from "date-fns/locale/ko";
import { Link } from "react-router-dom";

const STORAGE_KEY = "selectedMinistries";
const ACTIVE_MINISTRY_KEY = "activeMinistry";

function HomeComp() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMinistries, setSelectedMinistries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeMinistryId, setActiveMinistryId] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState([]); // 돌아오는 1주일간의 행사 및 찬양
  const [ministriesMap, setMinistriesMap] = useState({}); // ministry ID -> name 매핑

  // 로컬스토리지에서 선택된 ministry ID들 불러오기 및 ministry 정보 가져오기
  useEffect(() => {
    const loadSelectedMinistries = async () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          const selectedIds = Array.isArray(parsed) ? parsed : [];

          if (selectedIds.length > 0) {
            setLoading(true);
            // 선택된 ID들로 ministry 정보 가져오기
            const { data, error } = await supabase
              .from("ministry")
              .select("id, name")
              .in("id", selectedIds)
              .order("name");

            if (error) {
              console.error("Ministry 정보 가져오기 오류:", error);
              setSelectedMinistries([]);
            } else {
              setSelectedMinistries(data || []);
            }
            setLoading(false);
          } else {
            setSelectedMinistries([]);
          }
        } else {
          setSelectedMinistries([]);
        }
      } catch (err) {
        console.error("로컬스토리지 읽기 오류:", err);
        setSelectedMinistries([]);
        setLoading(false);
      }
    };

    loadSelectedMinistries();

    // 활성화된 ministry 불러오기
    const loadActiveMinistry = () => {
      const activeId = localStorage.getItem(ACTIVE_MINISTRY_KEY);
      setActiveMinistryId(activeId ? parseInt(activeId) : null);
    };

    loadActiveMinistry();

    // 로컬스토리지 변경 감지를 위한 이벤트 리스너
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY) {
        loadSelectedMinistries();
      } else if (e.key === ACTIVE_MINISTRY_KEY) {
        loadActiveMinistry();
      }
    };

    // 활성화된 ministry 변경 감지
    const handleActiveMinistryChange = () => {
      loadActiveMinistry();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(
      "activeMinistryChanged",
      handleActiveMinistryChange
    );

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(
        "activeMinistryChanged",
        handleActiveMinistryChange
      );
    };
  }, []);

  // 돌아오는 1주일간의 행사 및 찬양 가져오기
  useEffect(() => {
    const fetchUpcomingEvents = async () => {
      try {
        const today = startOfDay(new Date());
        const nextWeek = endOfDay(addDays(today, 7));

        // ministry 목록 가져오기 (ID -> name 매핑)
        const { data: ministriesData, error: ministriesError } = await supabase
          .from("ministry")
          .select("id, name");

        if (ministriesError) {
          console.error("Ministry 목록 조회 오류:", ministriesError);
          return;
        }

        if (ministriesData) {
          const map = {};
          ministriesData.forEach((m) => {
            map[m.id] = m.name;
          });
          setMinistriesMap(map);
        }

        // 돌아오는 1주일간의 calendar_events 가져오기
        const todayStr = format(today, "yyyy-MM-dd");
        const nextWeekStr = format(nextWeek, "yyyy-MM-dd");

        const { data, error } = await supabase
          .from("calendar_events")
          .select("*")
          .gte("singdate", todayStr)
          .lte("singdate", nextWeekStr)
          .order("singdate", { ascending: true })
          .order("ministry_id", { ascending: true });

        if (error) {
          console.error("행사 조회 오류:", error);
          setUpcomingEvents([]);
          return;
        }

        if (data) {
          setUpcomingEvents(data);
        } else {
          setUpcomingEvents([]);
        }
      } catch (err) {
        console.error("행사 조회 중 오류:", err);
        setUpcomingEvents([]);
      }
    };

    fetchUpcomingEvents();
  }, []);

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="p-4">
      <div>
        <h1 className="text-2xl font-bold mb-4">HomeComp</h1>
        <Button onClick={openModal}>나의 메뉴정하기</Button>
      </div>

      {/* 선택된 Ministry 표시 */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-3">나의 메뉴</h2>
        {loading ? (
          <p className="text-muted-foreground">로딩 중...</p>
        ) : selectedMinistries.length === 0 ? (
          <p className="text-muted-foreground">
            선택된 메뉴가 없습니다. "나의 메뉴정하기" 버튼을 클릭하여 메뉴를
            선택해주세요.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedMinistries.map((ministry) => {
              // 현재 활성화된 ministry 확인
              const isActive = activeMinistryId === ministry.id;

              return (
                <Button
                  key={ministry.id}
                  variant={isActive ? "default" : "outline"}
                  className={`min-w-[120px] ${
                    isActive ? "bg-primary text-primary-foreground" : ""
                  }`}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // 클릭한 ministry를 활성화 (즉시 state 업데이트)
                    setActiveMinistryId(ministry.id);
                    localStorage.setItem(
                      ACTIVE_MINISTRY_KEY,
                      String(ministry.id)
                    );
                    // storage 이벤트 발생 (다른 컴포넌트에 알림)
                    window.dispatchEvent(
                      new StorageEvent("storage", {
                        key: ACTIVE_MINISTRY_KEY,
                        newValue: String(ministry.id),
                      })
                    );
                    // 같은 탭에서도 감지되도록 커스텀 이벤트 발생
                    window.dispatchEvent(new Event("activeMinistryChanged"));
                  }}
                >
                  {ministry.name}
                </Button>
              );
            })}
          </div>
        )}
        {/* 돌아오는 1주일간의 행사 및 찬양 */}
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4">돌아오는 1주일 일정</h2>
          {upcomingEvents.length === 0 ? (
            <p className="text-muted-foreground">
              돌아오는 1주일간 예정된 일정이 없습니다.
            </p>
          ) : (
            <div className="space-y-6">
              {Object.entries(
                upcomingEvents.reduce((acc, event) => {
                  const ministryId = event.ministry_id ?? "기타";
                  if (!acc[ministryId]) {
                    acc[ministryId] = [];
                  }
                  acc[ministryId].push(event);
                  return acc;
                }, {})
              )
                .sort(([a], [b]) => {
                  // "기타"는 마지막에 배치
                  if (a === "기타") return 1;
                  if (b === "기타") return -1;
                  // 숫자로 변환 가능하면 숫자로 비교
                  const aNum = parseInt(a);
                  const bNum = parseInt(b);
                  if (!isNaN(aNum) && !isNaN(bNum)) {
                    return aNum - bNum;
                  }
                  return a.localeCompare(b);
                })
                .map(([ministryId, events]) => {
                  const ministryName =
                    ministryId === "기타"
                      ? "기타"
                      : ministriesMap[ministryId] || `부서 ID: ${ministryId}`;

                  // 날짜순으로 정렬
                  const sortedEvents = [...events].sort((a, b) => {
                    if (!a.singdate) return 1;
                    if (!b.singdate) return -1;
                    return new Date(a.singdate) - new Date(b.singdate);
                  });

                  // 찬양(type이 "one" 또는 "four")과 행사(type이 "text" 또는 기타)로 분류
                  const songs = sortedEvents.filter(
                    (e) => e.type === "one" || e.type === "four"
                  );
                  const schedules = sortedEvents.filter(
                    (e) =>
                      e.type === "text" ||
                      !e.type ||
                      (e.type !== "one" && e.type !== "four")
                  );

                  return (
                    <div
                      key={ministryId}
                      className="border rounded-lg p-4 bg-card"
                    >
                      <h3 className="text-lg font-bold mb-3 text-primary">
                        {ministryName}
                      </h3>

                      {/* 찬양 섹션 */}
                      {songs.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
                            찬양
                          </h4>
                          <div className="space-y-2">
                            {songs.map((song) => (
                              <div
                                key={song.id}
                                className="p-2 bg-muted/50 rounded-md hover:bg-muted transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <Link
                                      to={`/calen/view/${song.id}`}
                                      className="font-medium hover:text-primary transition-colors"
                                    >
                                      {song.title || "제목 없음"}
                                    </Link>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {song.singdate &&
                                        format(
                                          new Date(song.singdate),
                                          "yyyy년 MM월 dd일 (E)",
                                          { locale: ko }
                                        )}
                                    </div>
                                  </div>
                                  <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                                    {song.type === "one"
                                      ? "단일 링크"
                                      : song.type === "four"
                                      ? "4파트 링크"
                                      : song.type || "기타"}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 행사 섹션 */}
                      {schedules.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
                            행사
                          </h4>
                          <div className="space-y-2">
                            {schedules.map((schedule) => (
                              <div
                                key={schedule.id}
                                className="p-2 bg-muted/50 rounded-md hover:bg-muted transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <Link
                                      to={`/calen/view/${schedule.id}`}
                                      className="font-medium hover:text-primary transition-colors"
                                    >
                                      {schedule.title || "제목 없음"}
                                    </Link>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {schedule.singdate &&
                                        format(
                                          new Date(schedule.singdate),
                                          "yyyy년 MM월 dd일 (E)",
                                          { locale: ko }
                                        )}
                                    </div>
                                    {schedule.type === "text" &&
                                      schedule.text && (
                                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                          {schedule.text.substring(0, 100)}
                                          {schedule.text.length > 100 && "..."}
                                        </div>
                                      )}
                                  </div>
                                  <span className="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground">
                                    행사
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* 모달 */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* 모달 헤더 */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">나의 메뉴정하기</h2>
                <Button
                  variant="outline"
                  onClick={closeModal}
                  className="min-w-[80px]"
                >
                  닫기
                </Button>
              </div>

              {/* SelectorComp 내용 */}
              <SelectorComp
                onSelectionChange={async (selectedIds) => {
                  if (selectedIds.length > 0) {
                    const { data, error } = await supabase
                      .from("ministry")
                      .select("id, name")
                      .in("id", selectedIds)
                      .order("name");

                    if (!error && data) {
                      setSelectedMinistries(data);
                    }
                  } else {
                    setSelectedMinistries([]);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomeComp;
