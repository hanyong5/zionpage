import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useYerim } from "../context/YerimContext";
import YerimMemberWriteForm from "./YerimMemberWriteForm";

function YerimWrite() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { ministryCode: contextMinistryCode, addMember } = useYerim();

  // URL 쿼리 파라미터에서 code 가져오기
  const codeFromUrl = searchParams.get("code");

  const handleSubmit = async (formData) => {
    const result = await addMember(formData);
    if (result.success) {
      // code 파라미터 유지 (codeFromUrl 우선, 없으면 contextMinistryCode)
      const codeToUse = codeFromUrl || contextMinistryCode || "";
      const codeParam = codeToUse
        ? `?code=${encodeURIComponent(codeToUse)}`
        : "";
      navigate(`/yerim${codeParam}`);
    } else {
      throw new Error(result.error || "멤버 추가에 실패했습니다.");
    }
  };

  const handleCancel = () => {
    // code 파라미터 유지 (codeFromUrl 우선, 없으면 contextMinistryCode)
    const codeToUse = codeFromUrl || contextMinistryCode || "";
    const codeParam = codeToUse ? `?code=${encodeURIComponent(codeToUse)}` : "";
    navigate(`/yerim${codeParam}`);
  };

  return (
    <YerimMemberWriteForm
      title={`${codeFromUrl || contextMinistryCode || ""} - 멤버 추가하기`}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitButtonText="멤버 추가"
      cancelButtonText="취소"
      showMinistryInfo={true}
      initialMinistryCode={codeFromUrl || contextMinistryCode || ""}
    />
  );
}

export default YerimWrite;
