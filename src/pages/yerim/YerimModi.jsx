import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useYerim } from "../context/YerimContext";
import YerimMemberWriteForm from "./YerimMemberWriteForm";

function YerimModi() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const {
    updateMember,
    getMemberById,
    loading: contextLoading,
    ministryCode: contextMinistryCode,
  } = useYerim();

  // URL 쿼리 파라미터에서 code 가져오기
  const codeFromUrl = searchParams.get("code");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialFormData, setInitialFormData] = useState(null);

  // 멤버 데이터 로드
  useEffect(() => {
    const loadMember = () => {
      const member = getMemberById(id);
      if (member) {
        const currentYear = new Date().getFullYear();
        // URL 파라미터에서 year를 가져오거나, member.year 또는 현재 년도 사용
        const urlYear = searchParams.get("year");
        const initialYear = urlYear
          ? parseInt(urlYear)
          : member.year || currentYear;

        // 선택된 년도의 membership 정보 찾기
        let selectedMembership = null;
        if (member.allMemberships && member.allMemberships.length > 0) {
          selectedMembership = member.allMemberships.find(
            (m) => m.year === initialYear
          );
        }

        // 선택된 년도의 membership이 없으면 첫 번째 membership 사용
        if (
          !selectedMembership &&
          member.allMemberships &&
          member.allMemberships.length > 0
        ) {
          selectedMembership = member.allMemberships[0];
        }

        const formData = {
          name: member.name || "",
          phone: member.phone || "",
          birth: member.birth || "",
          memo: member.memo || "",
          join_date: member.join_date || "",
          photo: member.photo || "",
          is_active:
            selectedMembership?.is_active !== false
              ? selectedMembership.is_active
              : member.is_active !== false,
          // 부서 가입 정보
          year: initialYear,
          ministryCode:
            selectedMembership?.ministry?.name ||
            codeFromUrl ||
            contextMinistryCode ||
            "",
          part:
            selectedMembership?.part ||
            member.membershipPart ||
            member.part ||
            "SOPRANO",
          position: selectedMembership?.position || member.position || "",
          grade:
            selectedMembership?.grade !== null &&
            selectedMembership?.grade !== undefined
              ? String(selectedMembership.grade)
              : member.grade
              ? String(member.grade)
              : "",
          leader: selectedMembership?.leader || "",
          class:
            selectedMembership?.class !== null &&
            selectedMembership?.class !== undefined
              ? String(selectedMembership.class)
              : member.class
              ? String(member.class)
              : "",
          membershipId: selectedMembership?.id || member.membershipId || null,
        };

        setInitialFormData(formData);
        setLoading(false);
      } else if (!contextLoading) {
        setError("멤버를 찾을 수 없습니다.");
        setLoading(false);
      }
    };

    if (contextLoading) {
      const timer = setTimeout(loadMember, 100);
      return () => clearTimeout(timer);
    } else {
      loadMember();
    }
  }, [
    id,
    getMemberById,
    contextLoading,
    searchParams,
    codeFromUrl,
    contextMinistryCode,
  ]);

  const handleSubmit = async (formData) => {
    if (!formData.name.trim()) {
      throw new Error("이름을 입력해주세요.");
    }

    // 부서 가입 정보 검증
    if (!formData.ministryCode) {
      throw new Error("소속을 선택해주세요.");
    }

    if (!formData.position) {
      throw new Error("직분을 선택해주세요.");
    }

    // 학생일 경우 학년 확인
    if (
      (formData.position === "유년부" ||
        formData.position === "초등부" ||
        formData.position === "중학생" ||
        formData.position === "고등학생" ||
        formData.position === "대학생") &&
      !formData.grade
    ) {
      throw new Error("학년을 선택해주세요.");
    }

    const result = await updateMember(id, formData);
    if (result.success) {
      navigate(`/yerim?code=${contextMinistryCode || ""}`);
    } else {
      throw new Error(result.error || "멤버 수정에 실패했습니다.");
    }
  };

  const handleCancel = () => {
    navigate(`/yerim?code=${contextMinistryCode || ""}`);
  };

  // 년도 변경 핸들러 - 해당 년도의 membership 정보로 업데이트 (이력자료 활성화)
  const handleYearChange = (newYear, currentFormData, setFormData) => {
    const member = getMemberById(id);
    if (member && member.allMemberships && member.allMemberships.length > 0) {
      const selectedMembership = member.allMemberships.find(
        (m) => m.year === parseInt(newYear)
      );

      if (selectedMembership) {
        // 해당 년도의 membership 정보가 있으면 이력자료 활성화
        setFormData({
          ...currentFormData,
          year: newYear,
          grade:
            selectedMembership.grade !== null &&
            selectedMembership.grade !== undefined
              ? String(selectedMembership.grade)
              : "",
          part: selectedMembership.part || currentFormData.part || "SOPRANO",
          position: selectedMembership.position || "",
          leader: selectedMembership.leader || "",
          class:
            selectedMembership.class !== null &&
            selectedMembership.class !== undefined
              ? String(selectedMembership.class)
              : "",
          membershipId: selectedMembership.id || null,
          is_active:
            selectedMembership.is_active !== false
              ? selectedMembership.is_active
              : true,
          ministryCode:
            selectedMembership.ministry?.name ||
            currentFormData.ministryCode ||
            "",
        });
      } else {
        // 해당 년도의 membership이 없으면 기본값 사용 (새 이력자료 생성 준비)
        setFormData({
          ...currentFormData,
          year: newYear,
          grade: "",
          position: "",
          leader: "",
          class: "",
          membershipId: null,
          is_active: true, // 새 이력자료는 기본적으로 활성화
        });
      }
    } else {
      // allMemberships가 없으면 기본값만 업데이트
      setFormData({ ...currentFormData, year: newYear, is_active: true });
    }
  };

  if (loading) {
    return <div className="p-6">로딩 중...</div>;
  }

  if (error && !initialFormData) {
    return (
      <div className="p-6">
        <div className="p-3 bg-destructive/10 text-destructive rounded-lg">
          {error}
        </div>
        <button
          onClick={() => navigate(`/yerim?code=${contextMinistryCode || ""}`)}
          className="mt-4 px-6 py-3 border rounded-lg font-medium hover:bg-accent transition-colors"
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  if (!initialFormData) {
    return <div className="p-6">로딩 중...</div>;
  }

  return (
    <YerimMemberWriteForm
      title={`${contextMinistryCode || ""} - 멤버 수정하기`}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      initialData={initialFormData}
      submitButtonText="수정 완료"
      cancelButtonText="취소"
      showMinistryInfo={true}
      initialMinistryCode={codeFromUrl || contextMinistryCode || ""}
      onYearChange={handleYearChange}
      memberId={id}
      getMemberById={getMemberById}
    />
  );
}

export default YerimModi;
