import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useYerim } from "../context/YerimContext";
import supabase from "../../utils/supabase";

const PARTS = ["SOPRANO", "ALTO", "TENOR", "BASS"];
const POSITIONS = [
  "중학생",
  "고등학생",
  "대학생",
  "청년",
  "집사",
  "시무집사",
  "권사",
];

function YerimWrite() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { ministryCode: contextMinistryCode, addMember } = useYerim();

  const [ministryCodes, setMinistryCodes] = useState([]);

  // URL 쿼리 파라미터에서 파트 가져오기
  const partFromUrl = searchParams.get("part");
  const initialPart =
    partFromUrl && PARTS.includes(partFromUrl) ? partFromUrl : "SOPRANO";

  // 현재 년도로 초기화
  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    birth: "",
    grade: "",
    part: initialPart,
    memo: "",
    join_date: "",
    ministryCode: contextMinistryCode || "",
    position: "",
    year: currentYear, // 현재 년도로 자동 설정
  });

  // ministry 테이블에서 소속 목록 가져오기
  useEffect(() => {
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
          setMinistryCodes(data.map((item) => item.name));
        }
      } catch (err) {
        console.error("소속 목록 가져오기 중 오류:", err);
      }
    };

    fetchMinistries();
  }, []);
  const [previewImage, setPreviewImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

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

    if (!formData.part) {
      setError("파트를 선택해주세요.");
      setSubmitting(false);
      return;
    }

    if (!formData.ministryCode) {
      setError("소속을 선택해주세요.");
      setSubmitting(false);
      return;
    }

    try {
      const result = await addMember(formData);
      if (result.success) {
        navigate(`/yerim?code=${contextMinistryCode || ""}`);
      } else {
        setError(result.error || "멤버 추가에 실패했습니다.");
      }
    } catch (err) {
      setError("멤버 추가 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">
        {contextMinistryCode || ""} - 멤버 추가하기
      </h2>

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

        {/* 학년 입력 */}
        <div>
          <label htmlFor="grade" className="block text-sm font-medium mb-2">
            학년
          </label>
          <input
            type="number"
            id="grade"
            name="grade"
            value={formData.grade}
            onChange={handleChange}
            min="1"
            max="6"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="학년을 입력하세요 (선택사항)"
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

        {/* 소속 선택 */}
        <div>
          <label
            htmlFor="ministryCode"
            className="block text-sm font-medium mb-2"
          >
            소속 <span className="text-red-500">*</span>
          </label>
          <select
            id="ministryCode"
            name="ministryCode"
            value={formData.ministryCode}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">소속 선택</option>
            {ministryCodes.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>

        {/* 직분 선택 */}
        <div>
          <label htmlFor="position" className="block text-sm font-medium mb-2">
            직분
          </label>
          <select
            id="position"
            name="position"
            value={formData.position}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">직분 선택 (선택사항)</option>
            {POSITIONS.map((position) => (
              <option key={position} value={position}>
                {position}
              </option>
            ))}
          </select>
        </div>

        {/* 파트 선택 (라디오 버튼) */}
        <div>
          <label className="block text-sm font-medium mb-3">
            파트 <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {PARTS.map((part) => (
              <label
                key={part}
                className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                  formData.part === part
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-accent"
                }`}
              >
                <input
                  type="radio"
                  name="part"
                  value={part}
                  checked={formData.part === part}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="font-medium">{part}</span>
              </label>
            ))}
          </div>
        </div>

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
            {submitting ? "추가 중..." : "멤버 추가"}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/yerim?code=${contextMinistryCode || ""}`)}
            className="px-6 py-3 border rounded-lg font-medium hover:bg-accent transition-colors"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}

export default YerimWrite;
