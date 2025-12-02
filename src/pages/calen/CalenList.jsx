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
  const navigate = useNavigate();
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
              찬양 리스트{code && ` - ${code}`}
            </CardTitle>
            <Link
              to={code ? `/calen/write?code=${code}` : "/calen/write"}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm sm:text-base"
            >
              찬양넣기
            </Link>
          </div>
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => navigate("/calen/list?code=시온성가대")}
              className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              시온
            </button>

            <button
              onClick={() => navigate("/calen/list?code=예루살렘성가대")}
              className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              예루살롐
            </button>
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
                        찬양보기
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

                  {/* type이 없거나 다른 값인 경우 */}
                  {song.type !== "one" && song.type !== "four" && (
                    <div className="mt-3 text-sm text-muted-foreground">
                      타입 정보가 없습니다.
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
