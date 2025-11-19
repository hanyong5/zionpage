import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCalen } from "../context/CalenContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ko } from "date-fns/locale/ko";

function CalenView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getSongById, songs, loading: contextLoading } = useCalen();
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    const loadSong = () => {
      const foundSong = getSongById(id);
      if (foundSong) {
        setSong(foundSong);
        // four 타입이고 alllink가 있으면 all 탭을 기본으로, 없으면 첫 번째 사용 가능한 탭
        if (foundSong.type === "four") {
          if (foundSong.alllink) {
            setActiveTab("all");
          } else if (foundSong.slink) {
            setActiveTab("s");
          } else if (foundSong.alink) {
            setActiveTab("a");
          } else if (foundSong.tlink) {
            setActiveTab("t");
          } else if (foundSong.blink) {
            setActiveTab("b");
          }
        }
        setLoading(false);
      } else if (!contextLoading && songs.length > 0) {
        setLoading(false);
      } else if (!contextLoading) {
        const timer = setTimeout(loadSong, 100);
        return () => clearTimeout(timer);
      }
    };

    loadSong();
  }, [id, getSongById, contextLoading, songs]);

  if (loading) {
    return <div className="p-6">로딩 중...</div>;
  }

  if (!song) {
    return (
      <div className="p-6">
        <div className="p-3 bg-destructive/10 text-destructive rounded-lg">
          찬양을 찾을 수 없습니다.
        </div>
        <button
          onClick={() => navigate("/calen/list")}
          className="mt-4 px-6 py-3 border rounded-lg font-medium hover:bg-accent transition-colors"
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  // type이 "one"인 경우
  if (song.type === "one") {
    return (
      <div className="p-3 sm:p-4 md:p-6 min-h-screen">
        <Card className="max-w-full sm:max-w-2xl md:max-w-4xl lg:max-w-6xl mx-auto">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold">
                {song.title || "제목 없음"}
              </CardTitle>
              <button
                onClick={() => navigate("/calen/list")}
                className="px-4 py-2 border rounded-lg font-medium hover:bg-accent transition-colors text-sm sm:text-base"
              >
                목록으로
              </button>
            </div>
            {song.singdate && (
              <div className="text-sm text-muted-foreground mt-2">
                {format(new Date(song.singdate), "yyyy년 MM월 dd일", {
                  locale: ko,
                })}
              </div>
            )}
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {song.link ? (
              <div className="w-full h-[600px] sm:h-[700px] md:h-[800px] border rounded-lg overflow-hidden">
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
          </CardContent>
        </Card>
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
    ].filter((tab) => tab.link); // 링크가 있는 탭만 표시

    const currentTab = tabs.find((tab) => tab.id === activeTab);
    const currentLink = currentTab?.link;

    return (
      <div className="p-3 sm:p-4 md:p-6 min-h-screen">
        <Card className="max-w-full sm:max-w-2xl md:max-w-4xl lg:max-w-6xl mx-auto">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold">
                {song.title || "제목 없음"}
              </CardTitle>
              <button
                onClick={() => navigate("/calen/list")}
                className="px-4 py-2 border rounded-lg font-medium hover:bg-accent transition-colors text-sm sm:text-base"
              >
                목록으로
              </button>
            </div>
            {song.singdate && (
              <div className="text-sm text-muted-foreground mt-2">
                {format(new Date(song.singdate), "yyyy년 MM월 dd일", {
                  locale: ko,
                })}
              </div>
            )}
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {/* 탭 메뉴 */}
            {tabs.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4 border-b pb-4">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === tab.id
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
              <div className="w-full h-[600px] sm:h-[700px] md:h-[800px] border rounded-lg overflow-hidden">
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
          </CardContent>
        </Card>
      </div>
    );
  }

  // type이 없거나 다른 값인 경우
  return (
    <div className="p-6">
      <div className="p-3 bg-destructive/10 text-destructive rounded-lg">
        타입 정보가 없습니다.
      </div>
      <button
        onClick={() => navigate("/calen/list")}
        className="mt-4 px-6 py-3 border rounded-lg font-medium hover:bg-accent transition-colors"
      >
        목록으로 돌아가기
      </button>
    </div>
  );
}

export default CalenView;
