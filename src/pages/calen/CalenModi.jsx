import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCalen } from "../context/CalenContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function CalenModi() {
  const navigate = useNavigate();
  const { id } = useParams();
  const {
    updateSong,
    getSongById,
    songs,
    loading: contextLoading,
  } = useCalen();

  const [formData, setFormData] = useState({
    title: "",
    singdate: "",
    type: "one",
    link: "",
    slink: "",
    alink: "",
    tlink: "",
    blink: "",
    alllink: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 찬양 데이터 로드
  useEffect(() => {
    const loadSong = () => {
      const song = getSongById(id);
      if (song) {
        // singdate를 YYYY-MM-DD 형식으로 변환
        let singdateFormatted = "";
        if (song.singdate) {
          const date = new Date(song.singdate);
          singdateFormatted = date.toISOString().split("T")[0];
        }

        setFormData({
          title: song.title || "",
          singdate: singdateFormatted,
          type: song.type || "one",
          link: song.link || "",
          slink: song.slink || "",
          alink: song.alink || "",
          tlink: song.tlink || "",
          blink: song.blink || "",
          alllink: song.alllink || "",
        });
        setLoading(false);
      } else if (!contextLoading && songs.length > 0) {
        // 찬양을 찾을 수 없을 때
        setError("찬양을 찾을 수 없습니다.");
        setLoading(false);
      } else if (!contextLoading) {
        // songs가 아직 로드되지 않았을 때 잠시 대기
        const timer = setTimeout(loadSong, 100);
        return () => clearTimeout(timer);
      }
    };

    loadSong();
  }, [id, getSongById, contextLoading, songs]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    // 유효성 검사
    if (!formData.title.trim()) {
      setError("제목을 입력해주세요.");
      setSubmitting(false);
      return;
    }

    if (!formData.singdate) {
      setError("날짜를 선택해주세요.");
      setSubmitting(false);
      return;
    }

    if (!formData.type) {
      setError("타입을 선택해주세요.");
      setSubmitting(false);
      return;
    }

    // type에 따른 필수 필드 검사
    if (formData.type === "one" && !formData.link.trim()) {
      setError("링크를 입력해주세요.");
      setSubmitting(false);
      return;
    }

    if (formData.type === "four") {
      if (
        !formData.slink.trim() &&
        !formData.alink.trim() &&
        !formData.tlink.trim() &&
        !formData.blink.trim()
      ) {
        setError("최소 하나의 파트 링크를 입력해주세요.");
        setSubmitting(false);
        return;
      }
    }

    try {
      // type에 따라 데이터 정리
      const songData = {
        title: formData.title,
        singdate: formData.singdate,
        type: formData.type,
      };

      if (formData.type === "one") {
        songData.link = formData.link;
        // four 타입의 필드 제거
        songData.slink = null;
        songData.alink = null;
        songData.tlink = null;
        songData.blink = null;
        songData.alllink = null;
      } else if (formData.type === "four") {
        // one 타입의 필드 제거
        songData.link = null;
        if (formData.slink) songData.slink = formData.slink;
        if (formData.alink) songData.alink = formData.alink;
        if (formData.tlink) songData.tlink = formData.tlink;
        if (formData.blink) songData.blink = formData.blink;
        if (formData.alllink) songData.alllink = formData.alllink;
      }

      const result = await updateSong(id, songData);
      if (result.success) {
        // 성공 시 리스트 페이지로 이동
        navigate("/calen/list");
      } else {
        setError(result.error || "찬양 수정에 실패했습니다.");
      }
    } catch (err) {
      setError("찬양 수정 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-6">로딩 중...</div>;
  }

  if (error && !formData.title) {
    return (
      <div className="p-6">
        <div className="p-3 bg-destructive/10 text-destructive rounded-lg">
          {error}
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

  return (
    <div className="p-3 sm:p-4 md:p-6">
      <Card className="max-w-full sm:max-w-2xl md:max-w-4xl lg:max-w-6xl mx-auto">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold text-center">
            찬양 수정하기
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 제목 입력 */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-2">
                제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="찬양 제목을 입력하세요"
              />
            </div>

            {/* 날짜 입력 */}
            <div>
              <label
                htmlFor="singdate"
                className="block text-sm font-medium mb-2"
              >
                날짜 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="singdate"
                name="singdate"
                value={formData.singdate}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* 타입 선택 (라디오 버튼) */}
            <div>
              <label className="block text-sm font-medium mb-3">
                타입 <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                    formData.type === "one"
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <input
                    type="radio"
                    name="type"
                    value="one"
                    checked={formData.type === "one"}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <span className="font-medium">One (단일 링크)</span>
                </label>
                <label
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                    formData.type === "four"
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <input
                    type="radio"
                    name="type"
                    value="four"
                    checked={formData.type === "four"}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <span className="font-medium">Four (4파트 링크)</span>
                </label>
              </div>
            </div>

            {/* type이 "one"인 경우 link 입력 */}
            {formData.type === "one" && (
              <div>
                <label
                  htmlFor="link"
                  className="block text-sm font-medium mb-2"
                >
                  링크 <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  id="link"
                  name="link"
                  value={formData.link}
                  onChange={handleChange}
                  required={formData.type === "one"}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="https://..."
                />
              </div>
            )}

            {/* type이 "four"인 경우 4개 파트 링크 입력 */}
            {formData.type === "four" && (
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="slink"
                    className="block text-sm font-medium mb-2"
                  >
                    SOPRANO 링크
                  </label>
                  <input
                    type="url"
                    id="slink"
                    name="slink"
                    value={formData.slink}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label
                    htmlFor="alink"
                    className="block text-sm font-medium mb-2"
                  >
                    ALTO 링크
                  </label>
                  <input
                    type="url"
                    id="alink"
                    name="alink"
                    value={formData.alink}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label
                    htmlFor="tlink"
                    className="block text-sm font-medium mb-2"
                  >
                    TENOR 링크
                  </label>
                  <input
                    type="url"
                    id="tlink"
                    name="tlink"
                    value={formData.tlink}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label
                    htmlFor="blink"
                    className="block text-sm font-medium mb-2"
                  >
                    BASS 링크
                  </label>
                  <input
                    type="url"
                    id="blink"
                    name="blink"
                    value={formData.blink}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label
                    htmlFor="alllink"
                    className="block text-sm font-medium mb-2"
                  >
                    ALL 링크
                  </label>
                  <input
                    type="url"
                    id="alllink"
                    name="alllink"
                    value={formData.alllink}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="https://..."
                  />
                </div>
              </div>
            )}

            {/* 에러 메시지 */}
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-lg">
                {error}
              </div>
            )}

            {/* 버튼 */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "수정 중..." : "수정 완료"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/calen/list")}
                className="px-6 py-3 border rounded-lg font-medium hover:bg-accent transition-colors"
              >
                취소
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default CalenModi;
