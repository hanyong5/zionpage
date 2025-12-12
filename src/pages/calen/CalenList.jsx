import React, { useMemo, useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCalen } from "../context/CalenContext";
import { format } from "date-fns";
import { ko } from "date-fns/locale/ko";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import supabase from "../../utils/supabase";

function CalenList() {
  const [searchParams] = useSearchParams();
  const { songs, loading, error } = useCalen();
  const [ministryId, setMinistryId] = useState(null);
  const [ministries, setMinistries] = useState([]); // ministry 목록
  const [activeMinistryId, setActiveMinistryId] = useState(null); // 로컬스토리지의 activeMinistry
  const navigate = useNavigate();
  // URL 쿼리 파라미터에서 code 가져오기
  const code = searchParams.get("code");

  const ACTIVE_MINISTRY_KEY = "activeMinistry";

  // ministry 목록 가져오기
  useEffect(() => {
    const fetchMinistries = async () => {
      try {
        const { data, error } = await supabase
          .from("ministry")
          .select("id, name")
          .order("name");

        if (error) {
          console.error("소속 목록 조회 오류:", error);
          setMinistries([]);
          return;
        }

        if (data) {
          setMinistries(data);
        } else {
          setMinistries([]);
        }
      } catch (err) {
        console.error("소속 목록 조회 중 오류:", err);
        setMinistries([]);
      }
    };

    fetchMinistries();
  }, []);

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

  // 로컬스토리지의 activeMinistry 확인
  useEffect(() => {
    const checkActiveMinistry = () => {
      try {
        const activeId = localStorage.getItem(ACTIVE_MINISTRY_KEY);
        setActiveMinistryId(activeId ? parseInt(activeId) : null);
      } catch (err) {
        console.error("활성화된 ministry 확인 오류:", err);
        setActiveMinistryId(null);
      }
    };

    checkActiveMinistry();

    // 로컬스토리지 변경 감지
    const handleStorageChange = (e) => {
      if (e.key === ACTIVE_MINISTRY_KEY) {
        checkActiveMinistry();
      }
    };

    // 활성화된 ministry 변경 감지
    const handleActiveMinistryChange = () => {
      checkActiveMinistry();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(
      "activeMinistryChanged",
      handleActiveMinistryChange
    );

    // 주기적으로 확인 (같은 탭에서의 변경 감지)
    const interval = setInterval(() => {
      checkActiveMinistry();
    }, 500);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(
        "activeMinistryChanged",
        handleActiveMinistryChange
      );
      clearInterval(interval);
    };
  }, []);

  // ministry_id에 따라 songs 필터링
  const filteredSongs = useMemo(() => {
    if (!code || !ministryId) {
      return songs;
    }
    // ministry_id가 일치하는 경우만 필터링
    return songs.filter((song) => song.ministry_id === ministryId);
  }, [songs, code, ministryId]);

  if (loading) {
    return <div className="p-6">로딩 중...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">에러 발생: {error}</div>;
  }

  return (
    <div className="p-3 sm:p-4 md:p-6">
      <Card className="max-w-full sm:max-w-2xl md:max-w-4xl lg:max-w-6xl mx-auto">
        <CardHeader className="p-4 sm:p-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold">
              리스트{code && ` - ${code}`}
            </CardTitle>
            <Link
              to={code ? `/calen/write?code=${code}` : "/calen/write"}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm sm:text-base"
            >
              일정넣기
            </Link>
          </div>
          <div className="flex gap-2 mb-2 flex-wrap">
            {ministries.map((ministry) => {
              // URL의 code 파라미터 또는 로컬스토리지의 activeMinistry와 일치하면 활성화
              const isActive =
                code === ministry.name || activeMinistryId === ministry.id;
              return (
                <button
                  key={ministry.id}
                  onClick={() =>
                    navigate(
                      `/calen/list?code=${encodeURIComponent(ministry.name)}`
                    )
                  }
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {ministry.name}
                </button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {filteredSongs.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {code
                ? `${code}의 찬양 데이터가 없습니다.`
                : "찬양 데이터가 없습니다."}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSongs.map((song) => (
                <div
                  key={song.id}
                  className="border rounded-lg p-4 bg-card hover:bg-accent transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <div className="flex items-center justify-between w-full sm:w-auto sm:flex-1">
                      <h3 className="text-lg sm:text-xl font-semibold">
                        {song.title || "제목 없음"}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Link
                        to={`/calen/view/${song.id}`}
                        className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                      >
                        내용보기
                      </Link>
                      {/* 소속 표시 */}
                      {song.ministry_id &&
                        (song.ministry_id === 2 || song.ministry_id === 1) && (
                          <span
                            className={`inline-block ml-2 px-2 py-1 rounded text-xs font-semibold
                          ${
                            song.ministry_id === 2
                              ? "bg-blue-100 text-blue-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                          >
                            {song.ministry_id === 2 ? "시온" : "예루살롐"}
                          </span>
                        )}
                    </div>

                    {song.singdate && (
                      <div className="text-lg font-bold text-muted-foreground">
                        {format(new Date(song.singdate), "yyyy / MM / dd", {
                          locale: ko,
                        })}
                      </div>
                    )}
                    <div className="flex gap-2 ml-4">
                      <Link
                        to={`/calen/modify/${song.id}`}
                        className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                      >
                        M
                      </Link>
                      <button className="px-3 py-1 text-sm bg-destructive text-destructive-foreground text-white rounded-md hover:bg-destructive/90 transition-colors">
                        D
                      </button>
                    </div>
                  </div>

                  {/* type이 "text"인 경우 텍스트 내용 표시 */}
                  {song.type === "text" && song.text && (
                    <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                      <div className="text-sm font-medium mb-2">내용:</div>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {song.text}
                      </div>
                    </div>
                  )}

                  {/* 타입 정보 표시 */}
                  {song.type && (
                    <div className="mt-3">
                      <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-muted text-muted-foreground">
                        타입:{" "}
                        {song.type === "one"
                          ? "단일 링크"
                          : song.type === "four"
                          ? "4파트 링크"
                          : song.type === "text"
                          ? "텍스트"
                          : song.type}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default CalenList;
