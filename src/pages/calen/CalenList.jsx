import React from "react";
import { Link } from "react-router-dom";
import { useCalen } from "../context/CalenContext";
import { format } from "date-fns";
import { ko } from "date-fns/locale/ko";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function CalenList() {
  const { songs, loading, error } = useCalen();

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
              찬양 리스트
            </CardTitle>
            <Link
              to="/calen/write"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm sm:text-base"
            >
              찬양넣기
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {songs.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              찬양 데이터가 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {songs.map((song) => (
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
                    <Link
                      to={`/calen/view/${song.id}`}
                      className="px-3 py-1 text-sm bg-primary text-secondary-foreground text-white rounded-md hover:bg-secondary/90 transition-colors"
                    >
                      찬양보기
                    </Link>

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
