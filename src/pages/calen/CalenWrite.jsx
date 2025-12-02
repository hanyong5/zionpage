import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCalen } from "../context/CalenContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function CalenWrite() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addSong } = useCalen();

  // URL 쿼리 파라미터에서 code 가져오기
  const code = searchParams.get("code");

  // code에 따라 ministry_id 매핑
  const getMinistryId = (code) => {
    if (code === "시온성가대") return 2;
    if (code === "예루살렘성가대") return 1;
    return null;
  };

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
  const [error, setError] = useState(null);

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

      // code가 있으면 ministry_id 추가
      if (code) {
        const ministryId = getMinistryId(code);
        if (ministryId) {
          songData.ministry_id = ministryId;
        }
      }

      if (formData.type === "one") {
        songData.link = formData.link;
      } else if (formData.type === "four") {
        if (formData.slink) songData.slink = formData.slink;
        if (formData.alink) songData.alink = formData.alink;
        if (formData.tlink) songData.tlink = formData.tlink;
        if (formData.blink) songData.blink = formData.blink;
        if (formData.alllink) songData.alllink = formData.alllink;
      }

      const result = await addSong(songData);
      if (result.success) {
        // 성공 시 리스트 페이지로 이동 (code 파라미터 유지)
        navigate(code ? `/calen/list?code=${code}` : "/calen/list");
      } else {
        setError(result.error || "찬양 추가에 실패했습니다.");
      }
    } catch (err) {
      setError("찬양 추가 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6">
      <Card className="max-w-full sm:max-w-2xl md:max-w-4xl lg:max-w-6xl mx-auto">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold text-center">
            찬양 추가하기
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
                {submitting ? "추가 중..." : "찬양 추가"}
              </button>
              <button
                type="button"
                onClick={() =>
                  navigate(code ? `/calen/list?code=${code}` : "/calen/list")
                }
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

export default CalenWrite;
