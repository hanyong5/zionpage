import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useZion } from "../context/ZionContext";
import supabase from "../../utils/supabase";

const PARTS = ["SOPRANO", "ALTO", "TENOR", "BASS"];

function ZionModi() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { updateMember, getMemberById, loading: contextLoading } = useZion();

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    birth: "",
    part: "SOPRANO",
    memo: "",
    join_date: "",
    is_active: true,
    photo: "",
  });
  const [previewImage, setPreviewImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [originalPhoto, setOriginalPhoto] = useState(null); // 원본 사진 URL 저장

  // 멤버 데이터 로드
  useEffect(() => {
    const loadMember = () => {
      const member = getMemberById(id);
      if (member) {
        setFormData({
          name: member.name || "",
          phone: member.phone || "",
          birth: member.birth || "",
          part: member.part || "SOPRANO",
          memo: member.memo || "",
          join_date: member.join_date || "",
          is_active: member.is_active !== false,
          photo: member.photo || "",
        });
        if (member.photo) {
          setPreviewImage(member.photo);
          setOriginalPhoto(member.photo); // 원본 사진 URL 저장
        }
        setLoading(false);
      } else if (!contextLoading) {
        // 멤버를 찾을 수 없을 때
        setError("멤버를 찾을 수 없습니다.");
        setLoading(false);
      }
    };

    // Context가 로딩 중이면 잠시 대기
    if (contextLoading) {
      const timer = setTimeout(loadMember, 100);
      return () => clearTimeout(timer);
    } else {
      loadMember();
    }
  }, [id, getMemberById, contextLoading]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // 이미지를 정확히 200x200으로 리사이즈하는 함수 (중앙 크롭)
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

          // 이미지 품질 향상을 위한 설정
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          // 원본 이미지의 비율 계산
          const imgWidth = img.width;
          const imgHeight = img.height;
          const imgAspect = imgWidth / imgHeight;
          const targetAspect = targetWidth / targetHeight;

          let sourceX = 0;
          let sourceY = 0;
          let sourceWidth = imgWidth;
          let sourceHeight = imgHeight;

          // 중앙 크롭 계산
          if (imgAspect > targetAspect) {
            // 이미지가 더 넓은 경우: 높이 기준으로 크롭
            sourceHeight = imgHeight;
            sourceWidth = imgHeight * targetAspect;
            sourceX = (imgWidth - sourceWidth) / 2;
          } else {
            // 이미지가 더 높은 경우: 너비 기준으로 크롭
            sourceWidth = imgWidth;
            sourceHeight = imgWidth / targetAspect;
            sourceY = (imgHeight - sourceHeight) / 2;
          }

          // 배경을 흰색으로 채우기
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, targetWidth, targetHeight);

          // 이미지를 정확히 200x200으로 리사이즈하여 그리기
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

          // JPEG로 변환 (품질 0.95)
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

    // 이미지 파일인지 확인
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 업로드 가능합니다.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // 기존 사진이 있고 새 사진을 업로드하는 경우, 기존 파일 삭제
      if (originalPhoto && originalPhoto !== formData.photo) {
        try {
          const urlParts = originalPhoto.split("/photo/");
          if (urlParts.length > 1) {
            const oldFilePath = urlParts[1];
            await supabase.storage.from("photo").remove([oldFilePath]);
          }
        } catch (err) {
          console.error("기존 파일 삭제 오류:", err);
          // 삭제 실패해도 계속 진행
        }
      }

      // 이미지를 200x200으로 리사이즈
      const resizedBlob = await resizeImage(file, 200, 200);

      // 파일명 생성 (고유한 이름)
      const fileExt = file.name.split(".").pop() || "jpg";
      const fileName = `${id}_${Date.now()}.${fileExt}`;
      const filePath = `members/${fileName}`;

      // 리사이즈된 이미지를 File 객체로 변환
      const resizedFile = new File([resizedBlob], fileName, {
        type: file.type,
        lastModified: Date.now(),
      });

      // Supabase Storage에 업로드
      const { error: uploadError } = await supabase.storage
        .from("photo")
        .upload(filePath, resizedFile, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // 공개 URL 가져오기
      const {
        data: { publicUrl },
      } = supabase.storage.from("photo").getPublicUrl(filePath);

      // 미리보기 설정
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

    // Storage에서 파일 삭제
    if (currentPhoto) {
      try {
        // URL에서 파일 경로 추출
        // URL 형식: https://...supabase.co/storage/v1/object/public/photo/members/filename.jpg
        const urlParts = currentPhoto.split("/photo/");
        if (urlParts.length > 1) {
          const filePath = urlParts[1];

          // Supabase Storage에서 파일 삭제
          const { error: deleteError } = await supabase.storage
            .from("photo")
            .remove([filePath]);

          if (deleteError) {
            console.error("파일 삭제 오류:", deleteError);
            // 삭제 실패해도 로컬 상태는 업데이트
          }
        }
      } catch (err) {
        console.error("파일 삭제 중 오류:", err);
        // 삭제 실패해도 로컬 상태는 업데이트
      }
    }

    // 로컬 상태 업데이트
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

    // 유효성 검사
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

    try {
      const result = await updateMember(id, formData);
      if (result.success) {
        // 성공 시 리스트 페이지로 이동
        navigate("/zion/list");
      } else {
        setError(result.error || "멤버 수정에 실패했습니다.");
      }
    } catch (err) {
      setError("멤버 수정 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-6">로딩 중...</div>;
  }

  if (error && !formData.name) {
    return (
      <div className="p-6">
        <div className="p-3 bg-destructive/10 text-destructive rounded-lg">
          {error}
        </div>
        <button
          onClick={() => navigate("/zion/list")}
          className="mt-4 px-6 py-3 border rounded-lg font-medium hover:bg-accent transition-colors"
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">멤버 수정하기</h2>

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
            {/* 이미지 미리보기 */}
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

            {/* 파일 선택 */}
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

        {/* 활성 상태 체크박스 */}
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
            onClick={() => navigate("/zion/list")}
            className="px-6 py-3 border rounded-lg font-medium hover:bg-accent transition-colors"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}

export default ZionModi;
