import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useYerim } from "../context/YerimContext";
import supabase from "../../utils/supabase";
import { PARTS } from "./constants";

function YerimList() {
  const { members, loading, error, ministryCode, refreshMembers } = useYerim();
  const [selectedMembers, setSelectedMembers] = useState(new Set());
  const [promoting, setPromoting] = useState(false);
  const selectAllRef = useRef(null);
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // 성가대인지 확인
  const isChoir = ministryCode?.includes("성가대");
  // 중고등부인지 확인
  const isStudentMinistry = ministryCode === "중고등부";

  // code가 없는 경우 전체 회원 리스트 표시
  const isAllMembers = !ministryCode;

  // 파트별로 멤버 필터링 (is_active가 true인 멤버만, 년도 필터링 포함)
  // 성가대의 경우 membership.part 사용, 중고등부는 members.part 사용
  const getMembersByPart = (part) => {
    const filteredMembers = getActiveMembers();

    if (isStudentMinistry) {
      // 중고등부는 members 테이블의 part 사용
      return filteredMembers.filter((member) => member.part === part);
    } else {
      // 성가대는 membership 테이블의 part 사용
      return filteredMembers.filter((member) => member.membershipPart === part);
    }
  };

  // 활성화된 멤버만 가져오기 (년도 필터링 포함)
  const getActiveMembers = () => {
    return members
      .map((member) => {
        // 선택된 년도의 membership 정보 찾기
        if (member.allMemberships && member.allMemberships.length > 0) {
          const selectedYearMembership = member.allMemberships.find(
            (m) => m.year === selectedYear
          );

          if (selectedYearMembership) {
            return {
              ...member,
              membershipPart: selectedYearMembership.part || null,
              is_active: selectedYearMembership.is_active !== false,
              grade: selectedYearMembership.grade || null,
              year: selectedYearMembership.year || null,
              position: selectedYearMembership.position || null,
              membershipId: selectedYearMembership.id || null, // 선택된 년도의 membership id
              ministryName: selectedYearMembership.ministry?.name || null,
            };
          }
        } else if (!member.allMemberships) {
          // allMemberships가 없는 경우 (기존 데이터 호환성)
          // year가 선택된 년도와 일치하는지 확인
          if (member.year === selectedYear || !member.year) {
            return member;
          }
          return null;
        }

        // 선택된 년도의 membership이 없으면 null 반환 (필터링됨)
        return null;
      })
      .filter((member) => member !== null && member.is_active !== false);
  };
  const activeMembers = isAllMembers ? getActiveMembers() : [];
  const allSelected =
    isAllMembers &&
    activeMembers.length > 0 &&
    selectedMembers.size === activeMembers.length;
  const someSelected =
    isAllMembers &&
    selectedMembers.size > 0 &&
    selectedMembers.size < activeMembers.length;

  // indeterminate 상태 설정
  useEffect(() => {
    if (selectAllRef.current && isAllMembers) {
      selectAllRef.current.indeterminate = someSelected;
    } else if (selectAllRef.current) {
      selectAllRef.current.indeterminate = false;
    }
  }, [someSelected, isAllMembers]);

  // 체크박스 선택/해제 핸들러
  const handleCheckboxChange = (memberId) => {
    setSelectedMembers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  };

  // 전체 선택/해제 핸들러
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const activeMembers = getActiveMembers();
      setSelectedMembers(new Set(activeMembers.map((m) => m.id)));
    } else {
      setSelectedMembers(new Set());
    }
  };

  // 다음년도 승급 복제 핸들러
  const handlePromoteToNextYear = async () => {
    if (selectedMembers.size === 0) {
      alert("승급할 회원을 선택해주세요.");
      return;
    }

    if (
      !confirm(
        `선택한 회원들을 ${nextYear}년으로 승급 복제하시겠습니까? (${selectedYear}년 → ${nextYear}년)`
      )
    ) {
      return;
    }

    setPromoting(true);
    try {
      const selectedIds = Array.from(selectedMembers);

      // 선택된 회원들의 현재 선택된 년도 membership 데이터 가져오기
      const { data: membershipData, error: fetchError } = await supabase
        .from("membership")
        .select("*")
        .in("member_id", selectedIds)
        .eq("year", selectedYear);

      if (fetchError) {
        throw fetchError;
      }

      if (!membershipData || membershipData.length === 0) {
        alert(`${selectedYear}년 데이터가 없습니다.`);
        setPromoting(false);
        return;
      }

      // 다음 년도 데이터로 복제 (학년 6 이하인 경우만 학년 증가)
      const newMemberships = membershipData
        .filter((membership) => {
          // 학년이 6 이하인 경우만 승급
          return !membership.grade || membership.grade < 6;
        })
        .map((membership) => ({
          member_id: membership.member_id,
          ministry_id: membership.ministry_id,
          part: membership.part,
          grade: membership.grade ? membership.grade + 1 : null, // 학년 1 증가
          year: nextYear,
          is_active: membership.is_active,
        }));

      if (newMemberships.length === 0) {
        alert(
          "승급 가능한 회원이 없습니다. (학년이 6학년인 회원은 승급되지 않습니다)"
        );
        setPromoting(false);
        return;
      }

      // 다음 년도 데이터가 이미 있는지 확인
      const { data: existingNextYear, error: checkError } = await supabase
        .from("membership")
        .select("member_id, ministry_id")
        .in("member_id", selectedIds)
        .eq("year", nextYear);

      if (checkError) {
        throw checkError;
      }

      // 기존 다음 년도 데이터가 있는 경우 제외
      const existingSet = new Set(
        (existingNextYear || []).map((e) => `${e.member_id}-${e.ministry_id}`)
      );

      const toInsert = newMemberships.filter(
        (m) => !existingSet.has(`${m.member_id}-${m.ministry_id}`)
      );

      if (toInsert.length === 0) {
        alert("이미 다음 년도 데이터가 존재하는 회원들입니다.");
        setPromoting(false);
        return;
      }

      const { error: insertError } = await supabase
        .from("membership")
        .insert(toInsert);

      if (insertError) {
        throw insertError;
      }

      alert(
        `${toInsert.length}명의 회원이 ${nextYear}년으로 승급 복제되었습니다.`
      );
      setSelectedMembers(new Set());
      await refreshMembers();
    } catch (err) {
      alert("승급 복제 중 오류가 발생했습니다: " + err.message);
      console.error("승급 복제 오류:", err);
    } finally {
      setPromoting(false);
    }
  };

  if (loading) {
    return <div className="p-4">로딩 중...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">에러 발생: {error}</div>;
  }

  // code가 없으면 전체 회원 리스트 표시
  if (isAllMembers) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold">전체 회원 리스트</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedYear(currentYear)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedYear === currentYear
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {currentYear}년
              </button>
              <button
                onClick={() => setSelectedYear(nextYear)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedYear === nextYear
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {nextYear}년
              </button>
            </div>
          </div>
          <button
            onClick={handlePromoteToNextYear}
            disabled={promoting || selectedMembers.size === 0}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {promoting ? "승급 중..." : "다음년도 승급 복제"}
          </button>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  <input
                    type="checkbox"
                    ref={selectAllRef}
                    checked={allSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  사진
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  이름
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  직책
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  소속
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  전화번호
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  생년월일
                </th>
              </tr>
            </thead>
            <tbody>
              {activeMembers.length > 0 ? (
                activeMembers.map((member, index) => (
                  <tr
                    key={member.id}
                    className={`border-t hover:bg-accent transition-colors ${
                      index % 2 === 0 ? "bg-card" : "bg-muted/30"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedMembers.has(member.id)}
                        onChange={() => handleCheckboxChange(member.id)}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="px-4 py-3">
                      {member.photo ? (
                        <img
                          src={member.photo}
                          alt={member.name}
                          className="w-[50px] h-[50px] rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-[50px] h-[50px] rounded-full bg-gray-300 flex items-center justify-center text-lg font-semibold text-gray-700">
                          {member.name ? member.name[0] : "?"}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {member.name || "이름 없음"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {member.position || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {member.ministryName || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">{member.phone || "-"}</td>
                    <td className="px-4 py-3 text-sm">{member.birth || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="7"
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    멤버가 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 성가대가 아닌 경우 리스트 레이아웃으로 표시
  if (!isChoir) {
    const activeMembers = getActiveMembers();
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold">{ministryCode} - 멤버 리스트</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedYear(currentYear)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedYear === currentYear
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {currentYear}년
              </button>
              <button
                onClick={() => setSelectedYear(nextYear)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedYear === nextYear
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {nextYear}년
              </button>
            </div>
          </div>
          <Link
            to={`/yerim/write?code=${ministryCode}`}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            멤버 추가
          </Link>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  사진
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  이름
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  학년
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  전화번호
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  생년월일
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  직책
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  가입일
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  작업
                </th>
              </tr>
            </thead>
            <tbody>
              {activeMembers.length > 0 ? (
                activeMembers.map((member, index) => (
                  <tr
                    key={member.id}
                    className={`border-t hover:bg-accent transition-colors ${
                      index % 2 === 0 ? "bg-card" : "bg-muted/30"
                    }`}
                  >
                    <td className="px-4 py-3">
                      {member.photo ? (
                        <img
                          src={member.photo}
                          alt={member.name}
                          className="w-[50px] h-[50px] rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-[50px] h-[50px] rounded-full bg-gray-300 flex items-center justify-center text-lg font-semibold text-gray-700">
                          {member.name ? member.name[0] : "?"}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {member.name || "이름 없음"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {member.grade ? `${member.grade}학년` : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">{member.phone || "-"}</td>
                    <td className="px-4 py-3 text-sm">{member.birth || "-"}</td>
                    <td className="px-4 py-3 text-sm">
                      {member.position || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {member.join_date || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/yerim/modify/${
                          member.id
                        }?code=${ministryCode}&year=${
                          member.year || selectedYear
                        }`}
                        className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
                      >
                        수정
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="8"
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    멤버가 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 시온성가대, 예루살렘성가대 등의 경우 파트별로 표시
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-bold">
            {ministryCode} - 파트별 멤버 리스트
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedYear(currentYear)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedYear === currentYear
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {currentYear}년
            </button>
            <button
              onClick={() => setSelectedYear(nextYear)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedYear === nextYear
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {nextYear}년
            </button>
          </div>
        </div>
        <Link
          to={`/yerim/write?code=${ministryCode}`}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          멤버 추가
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {PARTS.map((part) => {
          const partMembers = getMembersByPart(part);
          return (
            <div key={part} className="border rounded-lg p-4 bg-card shadow-sm">
              <h3 className="text-xl font-semibold mb-4 pb-2 border-b flex justify-between items-center">
                <div>
                  {part}
                  <span className="ml-2 text-sm text-muted-foreground">
                    ({partMembers.length}명)
                  </span>
                </div>
                <Link
                  to={`/yerim/write?code=${ministryCode}&part=${part}`}
                  className="ml-2 text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
                >
                  인원추가
                </Link>
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {partMembers.length > 0 ? (
                  partMembers.map((member) => (
                    <div
                      key={member.id}
                      className="border rounded-lg p-3 bg-card hover:bg-accent transition-colors flex flex-col items-center text-center"
                    >
                      <div className="mb-2">
                        {member.photo ? (
                          <img
                            src={member.photo}
                            alt={member.name}
                            className="w-[50px] h-[50px] rounded-3xl object-cover mx-auto"
                          />
                        ) : (
                          <div className="w-[50px] h-[50px] rounded-3xl bg-gray-300 flex items-center justify-center text-4xl font-semibold text-gray-700">
                            {member.name ? member.name[0] : "?"}
                          </div>
                        )}
                      </div>
                      <div className="font-medium text-sm mb-1">
                        {member.name || "이름 없음"}
                      </div>
                      {member.position && (
                        <div className="text-xs text-muted-foreground mb-1">
                          {member.position}
                        </div>
                      )}
                      <Link
                        to={`/yerim/modify/${
                          member.id
                        }?code=${ministryCode}&year=${
                          member.year || selectedYear
                        }`}
                        className="text-xs text-primary hover:text-primary/80 hover:underline transition-colors"
                      >
                        수정
                      </Link>
                    </div>
                  ))
                ) : (
                  <div className="col-span-4 text-muted-foreground text-sm text-center py-4">
                    멤버가 없습니다
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default YerimList;
