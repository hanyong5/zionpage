import React, { useState, useEffect, useRef } from "react";
import { useYerim } from "../context/YerimContext";
import supabase from "../../utils/supabase";
import { PARTS, POSITIONS, LEADERS } from "./constants";

/**
 * 재사용 가능한 회원 작성 폼 컴포넌트
 * @param {Object} props
 * @param {string} props.title - 폼 제목
 * @param {Function} props.onSubmit - 제출 핸들러 (formData를 인자로 받음)
 * @param {Function} props.onCancel - 취소 핸들러
 * @param {Object} props.initialData - 초기 폼 데이터
 * @param {string} props.submitButtonText - 제출 버튼 텍스트 (기본값: "회원 추가")
 * @param {string} props.cancelButtonText - 취소 버튼 텍스트 (기본값: "취소")
 * @param {boolean} props.showMinistryInfo - 부서 가입 정보 표시 여부 (기본값: true)
 * @param {string} props.initialMinistryCode - 초기 소속 코드
 * @param {Function} props.onYearChange - 년도 변경 핸들러 (newYear, currentFormData, setFormData)
 * @param {string} props.memberId - 멤버 ID (수정 모드용)
 * @param {Function} props.getMemberById - 멤버 조회 함수 (수정 모드용)
 */
function YerimMemberWriteForm({
  title = "회원 추가하기",
  onSubmit,
  onCancel,
  initialData = {},
  submitButtonText = "회원 추가",
  cancelButtonText = "취소",
  showMinistryInfo = true,
  initialMinistryCode = "",
  onYearChange,
  memberId,
  getMemberById,
}) {
  const { ministryCode: contextMinistryCode, addMember } = useYerim();

  const [ministryCodes, setMinistryCodes] = useState([]);
  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    birth: "",
    memo: "",
    join_date: "",
    photo: "",
    is_active: true,
    // 부서 가입 정보
    year: currentYear,
    ministryCode: initialMinistryCode || contextMinistryCode || "",
    part: "SOPRANO",
    position: "",
    grade: "",
    leader: "",
    class: "",
    ...initialData, // 초기 데이터로 덮어쓰기
  });

  const [previewImage, setPreviewImage] = useState(initialData.photo || null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const initialDataRef = useRef(null);

  // ministry 테이블에서 소속 목록 가져오기
  useEffect(() => {
    if (!showMinistryInfo) return;

    const fetchMinistries = async () => {
      try {
        const { data, error } = await supabase
          .from("ministry")
          .select("name")
          .order("name");

        if (error) {
          console.error("소속 목록 가져오기 오류:", error);
          return;
        }

        if (data) {
          const codes = data.map((item) => item.name);
          setMinistryCodes(codes);

          // 초기 소속 코드가 있고, ministry 목록에 존재하면 자동 선택
          if (initialMinistryCode && codes.includes(initialMinistryCode)) {
            setFormData((prev) => ({
              ...prev,
              ministryCode: initialMinistryCode,
            }));
          }
        }
      } catch (err) {
        console.error("소속 목록 가져오기 중 오류:", err);
      }
    };

    fetchMinistries();
  }, [initialMinistryCode, showMinistryInfo]);

  // initialData가 처음 로드될 때만 formData 업데이트 (수정 모드용)
  // initialData가 실제로 변경되었는지 확인 (객체 참조 비교)
  useEffect(() => {
    if (
      initialData &&
      Object.keys(initialData).length > 0 &&
      initialDataRef.current !== initialData
    ) {
      // initialData의 주요 필드가 실제로 변경되었는지 확인
      const hasChanged =
        !initialDataRef.current ||
        initialDataRef.current.name !== initialData.name ||
        initialDataRef.current.year !== initialData.year ||
        initialDataRef.current.membershipId !== initialData.membershipId ||
        initialDataRef.current.class !== initialData.class;

      if (hasChanged) {
        // class 필드가 null이면 빈 문자열로, 숫자면 문자열로 변환
        const processedInitialData = {
          ...initialData,
          class:
            initialData.class === null || initialData.class === undefined
              ? ""
              : String(initialData.class),
          grade:
            initialData.grade === null || initialData.grade === undefined
              ? ""
              : String(initialData.grade),
        };

        setFormData((prev) => ({
          ...prev,
          ...processedInitialData,
        }));
        if (initialData.photo) {
          setPreviewImage(initialData.photo);
        }
        initialDataRef.current = initialData;
      }
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // 이미지를 정확히 200x200으로 리사이즈하는 함수
  const resizeImage = (file, targetWidth = 200, targetHeight = 200) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext("2d");

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          const imgWidth = img.width;
          const imgHeight = img.height;
          const imgAspect = imgWidth / imgHeight;
          const targetAspect = targetWidth / targetHeight;

          let sourceX = 0;
          let sourceY = 0;
          let sourceWidth = imgWidth;
          let sourceHeight = imgHeight;

          if (imgAspect > targetAspect) {
            sourceHeight = imgHeight;
            sourceWidth = imgHeight * targetAspect;
            sourceX = (imgWidth - sourceWidth) / 2;
          } else {
            sourceWidth = imgWidth;
            sourceHeight = imgWidth / targetAspect;
            sourceY = (imgHeight - sourceHeight) / 2;
          }

          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, targetWidth, targetHeight);

          ctx.drawImage(
            img,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            0,
            0,
            targetWidth,
            targetHeight
          );

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error("이미지 리사이즈에 실패했습니다."));
              }
            },
            "image/jpeg",
            0.95
          );
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // 이미지 파일 선택 핸들러
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 업로드 가능합니다.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const resizedBlob = await resizeImage(file, 200, 200);

      const fileExt = file.name.split(".").pop() || "jpg";
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `members/${fileName}`;

      const resizedFile = new File([resizedBlob], fileName, {
        type: file.type,
        lastModified: Date.now(),
      });

      const { error: uploadError } = await supabase.storage
        .from("photo")
        .upload(filePath, resizedFile, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("photo").getPublicUrl(filePath);

      setPreviewImage(publicUrl);
      setFormData((prev) => ({
        ...prev,
        photo: publicUrl,
      }));
    } catch (err) {
      setError("이미지 업로드에 실패했습니다: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // 이미지 삭제 핸들러
  const handleImageRemove = async () => {
    const currentPhoto = formData.photo;

    if (currentPhoto) {
      try {
        const urlParts = currentPhoto.split("/photo/");
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await supabase.storage.from("photo").remove([filePath]);
        }
      } catch (err) {
        console.error("파일 삭제 중 오류:", err);
      }
    }

    setPreviewImage(null);
    setFormData((prev) => ({
      ...prev,
      photo: "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (!formData.name.trim()) {
      setError("이름을 입력해주세요.");
      setSubmitting(false);
      return;
    }

    // 부서 가입 정보 검증
    if (showMinistryInfo) {
      if (!formData.ministryCode) {
        setError("소속을 선택해주세요.");
        setSubmitting(false);
        return;
      }

      if (!formData.position) {
        setError("직분을 선택해주세요.");
        setSubmitting(false);
        return;
      }

      // 학생일 경우 학년 확인
      if (
        (formData.position === "초등학교" ||
          formData.position === "중학생" ||
          formData.position === "고등학생" ||
          formData.position === "대학생") &&
        !formData.grade
      ) {
        setError("학년을 선택해주세요.");
        setSubmitting(false);
        return;
      }
    }

    try {
      if (onSubmit) {
        await onSubmit(formData);
      } else {
        // 기본 동작: addMember 사용
        const result = await addMember(formData);
        if (!result.success) {
          setError(result.error || "회원 추가에 실패했습니다.");
        }
      }
    } catch (err) {
      setError(err.message || "회원 추가 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">{title}</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 이름 입력 */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-2">
            이름 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="이름을 입력하세요"
          />
        </div>

        {/* 전화번호 입력 */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-2">
            전화번호
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="전화번호를 입력하세요 (선택사항)"
          />
        </div>

        {/* 생년월일 입력 */}
        <div>
          <label htmlFor="birth" className="block text-sm font-medium mb-2">
            생년월일
          </label>
          <input
            type="date"
            id="birth"
            name="birth"
            value={formData.birth}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* 사진 첨부 */}
        <div>
          <label className="block text-sm font-medium mb-2">사진</label>
          <div className="flex flex-col gap-4">
            {previewImage && (
              <div className="relative inline-block">
                <img
                  src={previewImage}
                  alt="프로필 미리보기"
                  className="w-[200px] h-[200px] object-cover border rounded-lg"
                />
                <button
                  type="button"
                  onClick={handleImageRemove}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            )}

            <div>
              <input
                type="file"
                id="photo"
                name="photo"
                accept="image/*"
                onChange={handleImageChange}
                disabled={uploading}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              />
              {uploading && (
                <p className="text-sm text-muted-foreground mt-1">
                  업로드 중...
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                이미지 크기: 200x200px, 최대 5MB
              </p>
            </div>
          </div>
        </div>

        {/* 가입일 입력 */}
        <div>
          <label htmlFor="join_date" className="block text-sm font-medium mb-2">
            가입일
          </label>
          <input
            type="date"
            id="join_date"
            name="join_date"
            value={formData.join_date}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* 부서 가입 정보 섹션 */}
        {showMinistryInfo && (
          <div className="border-t pt-6 mt-6">
            <h3 className="text-xl font-bold mb-4">부서 가입 정보</h3>

            {/* 년도 선택 - 버튼 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                년도 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2 flex-wrap">
                {[new Date().getFullYear(), new Date().getFullYear() + 1].map(
                  (year) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => {
                        if (onYearChange) {
                          onYearChange(year, formData, setFormData);
                        } else {
                          setFormData({ ...formData, year });
                        }
                      }}
                      className={`px-4 py-2 rounded-lg border transition-colors ${
                        formData.year === year
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-white border-border hover:bg-accent"
                      }`}
                    >
                      {year}년
                    </button>
                  )
                )}
              </div>
            </div>

            {/* 소속 선택 - 버튼 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                소속 <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {ministryCodes.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        ministryCode: code,
                        part: "SOPRANO", // 소속 변경 시 파트 초기화
                      })
                    }
                    className={`px-4 py-2 rounded-lg border transition-colors text-sm ${
                      formData.ministryCode === code
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-white border-border hover:bg-accent"
                    }`}
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>

            {/* 직분 선택 - 버튼 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                직분 <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {POSITIONS.map((position) => (
                  <button
                    key={position}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        position,
                        grade: "", // 직분 변경 시 학년 초기화
                      })
                    }
                    className={`px-4 py-2 rounded-lg border transition-colors text-sm ${
                      formData.position === position
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-white border-border hover:bg-accent"
                    }`}
                  >
                    {position}
                  </button>
                ))}
              </div>
            </div>

            {/* 파트 선택 - 시온성가대/예루살렘성가대일 때만 표시 */}
            {(formData.ministryCode === "시온성가대" ||
              formData.ministryCode === "예루살렘성가대") && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">파트</label>
                <div className="grid grid-cols-2 gap-2">
                  {PARTS.map((part) => (
                    <button
                      key={part}
                      type="button"
                      onClick={() => setFormData({ ...formData, part })}
                      className={`px-4 py-2 rounded-lg border transition-colors ${
                        formData.part === part
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-white border-border hover:bg-accent"
                      }`}
                    >
                      {part}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 학년 - 학생일 경우만 표시 */}
            {(formData.position === "유년부" ||
              formData.position === "초등부" ||
              formData.position === "중학생" ||
              formData.position === "고등학생" ||
              formData.position === "대학생") && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  학년 <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    let grades = [];
                    if (formData.position === "유년부") {
                      grades = [1, 2, 3]; // 유년부: 1~6학년
                    } else if (formData.position === "초등부") {
                      grades = [4, 5, 6];
                    } else if (
                      formData.position === "중학생" ||
                      formData.position === "고등학생"
                    ) {
                      grades = [1, 2, 3]; // 중고등부: 1~3학년
                    } else if (formData.position === "대학생") {
                      grades = [1, 2, 3, 4]; // 대학: 1~4학년
                    }
                    return grades.map((grade) => (
                      <button
                        key={grade}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            grade: grade.toString(),
                          })
                        }
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                          formData.grade === grade.toString()
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-white border-border hover:bg-accent"
                        }`}
                      >
                        {grade}학년
                      </button>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* 반 선택 - 학생일 경우만 표시 */}
            {(formData.position === "유년부" ||
              formData.position === "초등부" ||
              formData.position === "중학생" ||
              formData.position === "고등학생" ||
              formData.position === "대학생") && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">반</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, class: "" })}
                    className={`px-4 py-2 rounded-lg border transition-colors text-sm ${
                      !formData.class
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-white border-border hover:bg-accent"
                    }`}
                  >
                    없음
                  </button>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((classNum) => (
                    <button
                      key={classNum}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          class: classNum.toString(),
                        })
                      }
                      className={`px-4 py-2 rounded-lg border transition-colors text-sm ${
                        formData.class === classNum.toString()
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-white border-border hover:bg-accent"
                      }`}
                    >
                      {classNum}반
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 리더 선택 - 버튼 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                리더 (선택사항)
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, leader: "" })}
                  className={`px-4 py-2 rounded-lg border transition-colors text-sm ${
                    !formData.leader
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white border-border hover:bg-accent"
                  }`}
                >
                  없음
                </button>
                {LEADERS.map((leader) => (
                  <button
                    key={leader}
                    type="button"
                    onClick={() => setFormData({ ...formData, leader })}
                    className={`px-4 py-2 rounded-lg border transition-colors text-sm ${
                      formData.leader === leader
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-white border-border hover:bg-accent"
                    }`}
                  >
                    {leader}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 메모 입력 */}
        <div>
          <label htmlFor="memo" className="block text-sm font-medium mb-2">
            메모
          </label>
          <textarea
            id="memo"
            name="memo"
            value={formData.memo}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            placeholder="메모를 입력하세요 (선택사항)"
          />
        </div>

        {/* 활성 상태 체크박스 */}
        {showMinistryInfo && (
          <div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="mr-2 w-4 h-4"
              />
              <span className="text-sm font-medium">활성 상태</span>
            </label>
            <p className="text-xs text-muted-foreground mt-1">
              체크 해제 시 리스트에서 숨겨집니다.
            </p>
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
            {submitting ? "처리 중..." : submitButtonText}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border rounded-lg font-medium hover:bg-accent transition-colors"
            >
              {cancelButtonText}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default YerimMemberWriteForm;
