import React from "react";
import { useNavigate } from "react-router-dom";
import { useYerim } from "../context/YerimContext";
import supabase from "../../utils/supabase";
import YerimMemberWriteForm from "./YerimMemberWriteForm";

function YerimMemberWrite() {
  const navigate = useNavigate();
  const { refreshMembers } = useYerim();

  const handleSubmit = async (formData) => {
    // members 테이블에만 기본 정보 추가
    const { data: newMember, error: memberError } = await supabase
      .from("members")
      .insert([formData])
      .select()
      .single();

    if (memberError) {
      throw memberError;
    }

    // 멤버 리스트 새로고침
    await refreshMembers();

    // 회원 목록 페이지로 이동
    navigate("/yerim/member-list");
  };

  const handleCancel = () => {
    navigate("/yerim/member-list");
  };

  return (
    <YerimMemberWriteForm
      title="회원 추가하기"
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitButtonText="회원 추가"
      cancelButtonText="취소"
      showMinistryInfo={false}
    />
  );
}

export default YerimMemberWrite;
