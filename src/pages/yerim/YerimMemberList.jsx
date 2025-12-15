import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useYerim } from "../context/YerimContext";
import supabase from "../../utils/supabase";
import { LEADERS, PARTS, POSITIONS } from "./constants";

function YerimMemberList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { members, loading, error, refreshMembers } = useYerim();
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [activeTab, setActiveTab] = useState("basic"); // "basic" 또는 "yearly"
  const [selectedYear, setSelectedYear] = useState("all"); // "all" 또는 특정 년도
  const [selectedMinistry, setSelectedMinistry] = useState(
    searchParams.get("code") || ""
  );
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [ministryCodes, setMinistryCodes] = useState([]);
  const [joinFormData, setJoinFormData] = useState({
    year: new Date().getFullYear(),
    ministryCode: "",
    part: "SOPRANO",
    position: "",
    grade: "",
    leader: "",
    class: "",
  });
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const [deletingMembershipId, setDeletingMembershipId] = useState(null);
  const [memberPoints, setMemberPoints] = useState({}); // member_id -> balance 매핑

  // 소속 선택 핸들러
  const handleMinistryChange = (ministryCode) => {
    setSelectedMinistry(ministryCode);
    if (ministryCode) {
      setSearchParams({ code: ministryCode });
    } else {
      setSearchParams({});
    }
  };

  // 검색어 및 소속으로 필터링
  useEffect(() => {
    if (!members || members.length === 0) {
      setFilteredMembers([]);
      return;
    }

    let filtered = members;

    // 소속으로 필터링
    if (selectedMinistry) {
      filtered = filtered.filter((member) => {
        if (member.allMemberships && member.allMemberships.length > 0) {
          return member.allMemberships.some(
            (ms) => ms.ministry?.name === selectedMinistry
          );
        }
        return member.ministryName === selectedMinistry;
      });
    }

    // 검색어로 필터링
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((member) => {
        const name = (member.name || "").toLowerCase();
        const phone = (member.phone || "").toLowerCase();
        return name.includes(term) || phone.includes(term);
      });
    }

    setFilteredMembers(filtered);
  }, [members, searchTerm, selectedMinistry]);

  // 날짜 포맷팅
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  // 사용 가능한 년도 목록 추출
  const getAvailableYears = () => {
    const years = new Set();
    filteredMembers.forEach((member) => {
      if (member.allMemberships) {
        member.allMemberships.forEach((ms) => {
          if (ms.year) {
            years.add(ms.year);
          }
        });
      }
    });
    return Array.from(years).sort((a, b) => b - a); // 내림차순 정렬
  };

  // 선택된 년도에 따라 membership 필터링
  const getFilteredMemberships = (memberships) => {
    if (selectedYear === "all") {
      return memberships;
    }
    return memberships.filter((ms) => ms.year === parseInt(selectedYear));
  };

  // 직분 표시 포맷팅 (학생일 경우 학년 붙이기)
  const formatPosition = (position, grade) => {
    if (!position) return null;

    const studentPositions = [
      "유년부",
      "초등부",
      "중학생",
      "고등학생",
      "대학생",
    ];
    if (studentPositions.includes(position) && grade) {
      return `${position}/${grade}학년`;
    }

    return position;
  };

  // 성가대 외 부서에서 교사인지 확인
  const isTeacherInNonChoir = (member) => {
    if (!member.allMemberships || member.allMemberships.length === 0) {
      return false;
    }

    const choirNames = ["시온성가대", "예루살렘성가대"];
    return member.allMemberships.some(
      (ms) =>
        ms.leader === "교사" &&
        ms.ministry?.name &&
        !choirNames.includes(ms.ministry.name)
    );
  };

  // membership 삭제 처리
  const handleDeleteMembership = async (
    membershipId,
    memberName,
    year,
    ministryName
  ) => {
    if (
      !confirm(
        `${memberName}님의 ${year}년 ${ministryName} 소속 정보를 삭제하시겠습니까?`
      )
    ) {
      return;
    }

    setDeletingMembershipId(membershipId);

    try {
      const { error } = await supabase
        .from("membership")
        .delete()
        .eq("id", membershipId);

      if (error) {
        throw error;
      }

      // 성공 시 리스트 새로고침
      await refreshMembers();
    } catch (err) {
      alert("삭제 중 오류가 발생했습니다: " + err.message);
    } finally {
      setDeletingMembershipId(null);
    }
  };

  // ministry 목록 가져오기
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

  // URL 파라미터에서 소속 읽어오기
  useEffect(() => {
    const codeFromUrl = searchParams.get("code");
    if (codeFromUrl) {
      setSelectedMinistry(codeFromUrl);
    } else {
      setSelectedMinistry("");
    }
  }, [searchParams]);

  // 포인트 정보 가져오기
  useEffect(() => {
    const fetchMemberPoints = async () => {
      if (!filteredMembers || filteredMembers.length === 0) {
        setMemberPoints({});
        return;
      }

      try {
        const memberIds = filteredMembers.map((m) => m.id);
        const { data: pointsData, error } = await supabase
          .from("member_points")
          .select("id, balace")
          .in("id", memberIds);

        if (error) {
          console.error("포인트 정보 가져오기 오류:", error);
          return;
        }

        // member_id -> balance 매핑 생성
        const pointsMap = {};
        if (pointsData) {
          pointsData.forEach((point) => {
            pointsMap[point.id] = point.balace || 0;
          });
        }

        setMemberPoints(pointsMap);
      } catch (err) {
        console.error("포인트 정보 가져오기 중 오류:", err);
      }
    };

    fetchMemberPoints();
  }, [filteredMembers]);

  // 가입 모달 열기
  const handleOpenJoinModal = (member) => {
    setSelectedMember(member);
    setJoinFormData({
      year: new Date().getFullYear(),
      ministryCode: "",
      part: "SOPRANO",
      position: "",
      grade: "",
      leader: "",
      class: "",
    });
    setJoinError(null);
    setShowJoinModal(true);
  };

  // 가입 모달 닫기
  const handleCloseJoinModal = () => {
    setShowJoinModal(false);
    setSelectedMember(null);
    setJoinError(null);
  };

  // 년도별 가입 처리
  const handleJoinMembership = async () => {
    if (!selectedMember) return;

    setJoining(true);
    setJoinError(null);

    try {
      // 소속 선택 확인
      if (!joinFormData.ministryCode) {
        setJoinError("소속을 선택해주세요.");
        setJoining(false);
        return;
      }

      // 직분 선택 확인
      if (!joinFormData.position) {
        setJoinError("직분을 선택해주세요.");
        setJoining(false);
        return;
      }

      // 학생일 경우 학년 확인
      const gradeRequiredPositions = [
        "유년부",
        "초등부",
        "중학생",
        "고등학생",
        "대학생",
      ];
      if (
        gradeRequiredPositions.includes(joinFormData.position) &&
        !joinFormData.grade
      ) {
        setJoinError("학년을 선택해주세요.");
        setJoining(false);
        return;
      }

      // ministry 정보 가져오기
      const { data: ministryData, error: ministryError } = await supabase
        .from("ministry")
        .select("id")
        .eq("name", joinFormData.ministryCode)
        .single();

      if (ministryError) {
        throw ministryError;
      }

      // 중복 체크: 같은 회원, 같은 년도, 같은 소속이 이미 있는지 확인
      const { data: existingMembership, error: checkError } = await supabase
        .from("membership")
        .select("id")
        .eq("member_id", selectedMember.id)
        .eq("ministry_id", ministryData.id)
        .eq("year", joinFormData.year)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existingMembership) {
        setJoinError(
          `${joinFormData.year}년에 이미 ${joinFormData.ministryCode}에 가입되어 있습니다.`
        );
        setJoining(false);
        return;
      }

      // membership 추가
      const { error: membershipError } = await supabase
        .from("membership")
        .insert([
          {
            member_id: selectedMember.id,
            ministry_id: ministryData.id,
            year: joinFormData.year,
            part: joinFormData.part || null,
            position: joinFormData.position || null,
            grade: joinFormData.grade || null,
            leader: joinFormData.leader || null,
            class: joinFormData.class || null,
            is_active: true,
          },
        ]);

      if (membershipError) {
        throw membershipError;
      }

      // 성공 시 모달 닫고 리스트 새로고침
      handleCloseJoinModal();
      await refreshMembers();
    } catch (err) {
      setJoinError(err.message || "가입 처리 중 오류가 발생했습니다.");
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold">회원 목록</h2>
        <Link
          to="/yerim/member-write"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          회원 추가
        </Link>
      </div>

      {/* 검색 바 */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="이름 또는 전화번호로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* 회원 수 표시 */}
      <div className="mb-4 text-sm text-muted-foreground">
        총 {filteredMembers.length}명
      </div>

      {/* 탭 메뉴 */}
      <div className="mb-6 border-b">
        <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("basic")}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === "basic"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              기본 정보
            </button>
            <button
              onClick={() => setActiveTab("yearly")}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === "yearly"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              년도별 정보
            </button>
          </div>

          {/* 년도 선택 및 소속 선택 (년도별 정보 탭일 때만 표시) */}
          {activeTab === "yearly" && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label htmlFor="year-select" className="text-sm font-medium">
                  년도:
                </label>
                <select
                  id="year-select"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                >
                  <option value="all">전체</option>
                  {getAvailableYears().map((year) => (
                    <option key={year} value={year}>
                      {year}년
                    </option>
                  ))}
                </select>
              </div>
              {/* 소속 선택 */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="ministry-select"
                  className="text-sm font-medium"
                >
                  소속:
                </label>
                <select
                  id="ministry-select"
                  value={selectedMinistry}
                  onChange={(e) => handleMinistryChange(e.target.value)}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                >
                  <option value="">전체</option>
                  {ministryCodes.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 회원 리스트 */}
      {filteredMembers.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground bg-card rounded-lg border">
          {searchTerm ? "검색 결과가 없습니다." : "등록된 회원이 없습니다."}
        </div>
      ) : activeTab === "basic" ? (
        <>
          {/* 기본 정보 탭 - 모바일: 카드 형태 */}
          <div className="md:hidden space-y-4">
            {filteredMembers.map((member) => (
              <Link
                key={member.id}
                to={`/yerim/member/${member.id}`}
                className="block bg-white rounded-lg shadow-md p-4 border hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center gap-4">
                  {/* 사진 */}
                  <div className="shrink-0">
                    {member.photo ? (
                      <img
                        src={member.photo}
                        alt={member.name || "회원 사진"}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center text-lg font-semibold text-gray-700">
                        {member.name ? member.name[0] : "?"}
                      </div>
                    )}
                  </div>

                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg mb-1 truncate">
                      {member.name || "이름 없음"}
                      {isTeacherInNonChoir(member) && (
                        <span className="ml-2 text-sm text-primary font-normal">
                          교사
                        </span>
                      )}
                    </h3>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {member.phone && (
                        <div className="truncate">📞 {member.phone}</div>
                      )}
                      {member.birth && <div>🎂 {formatDate(member.birth)}</div>}
                      {member.join_date && (
                        <div>📅 가입: {formatDate(member.join_date)}</div>
                      )}
                      <div className="font-medium text-primary">
                        ⭐ 포인트: {memberPoints[member.id] || 0}점
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* 기본 정보 탭 - 데스크톱: 테이블 형태 */}
          <div className="hidden md:block bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      사진
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      이름
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      전화번호
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      생년월일
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      가입일
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      포인트
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member, index) => (
                    <tr
                      key={member.id}
                      className={`border-t ${
                        index % 2 === 0 ? "bg-card" : "bg-muted/30"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <Link to={`/yerim/member/${member.id}`}>
                          {member.photo ? (
                            <img
                              src={member.photo}
                              alt={member.name || "회원 사진"}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-sm font-semibold text-gray-700">
                              {member.name ? member.name[0] : "?"}
                            </div>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <Link
                          to={`/yerim/member/${member.id}`}
                          className="hover:text-primary hover:underline transition-colors"
                        >
                          {member.name || "이름 없음"}
                          {isTeacherInNonChoir(member) && (
                            <span className="ml-2 text-sm text-primary font-normal">
                              교사
                            </span>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {member.phone || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {formatDate(member.birth)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {formatDate(member.join_date)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-primary">
                        {memberPoints[member.id] || 0}점
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleOpenJoinModal(member)}
                          className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                        >
                          부서가입
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* 년도별 정보 탭 - 모바일: 카드 형태 */}
          <div className="md:hidden space-y-4">
            {filteredMembers.map((member) => {
              const memberships = member.allMemberships || [];
              const filteredMemberships = getFilteredMemberships(memberships);
              const sortedMemberships = [...filteredMemberships].sort(
                (a, b) => (b.year || 0) - (a.year || 0)
              );

              return (
                <div
                  key={member.id}
                  className="bg-white rounded-lg shadow-md p-4 border"
                >
                  <Link
                    to={`/yerim/member/${member.id}`}
                    className="flex items-center gap-4 mb-4"
                  >
                    {/* 사진 */}
                    <div className="shrink-0">
                      {member.photo ? (
                        <img
                          src={member.photo}
                          alt={member.name || "회원 사진"}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center text-lg font-semibold text-gray-700">
                          {member.name ? member.name[0] : "?"}
                        </div>
                      )}
                    </div>

                    {/* 이름 */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">
                        {member.name || "이름 없음"}
                        {isTeacherInNonChoir(member) && (
                          <span className="ml-2 text-sm text-primary font-normal">
                            교사
                          </span>
                        )}
                      </h3>
                    </div>
                  </Link>

                  {/* 년도별 정보 */}
                  {sortedMemberships.length > 0 ? (
                    <div className="space-y-3 mt-4 pt-4 border-t">
                      {sortedMemberships.map((ms) => (
                        <div
                          key={ms.id}
                          className="bg-muted/30 rounded-lg p-3 space-y-1"
                        >
                          <div className="font-semibold text-primary">
                            {ms.year || "-"}년
                          </div>
                          <div className="text-sm space-y-1">
                            {ms.ministry?.name && (
                              <div>🏢 소속: {ms.ministry.name}</div>
                            )}
                            {formatPosition(ms.position, ms.grade) && (
                              <div>
                                👤 직분: {formatPosition(ms.position, ms.grade)}
                              </div>
                            )}
                            {ms.class && <div>📚 반: {ms.class}반</div>}
                            {ms.leader && <div>⭐ 리더: {ms.leader}</div>}
                          </div>
                          <div className="mt-2 flex justify-end">
                            <button
                              onClick={() =>
                                handleDeleteMembership(
                                  ms.id,
                                  member.name,
                                  ms.year,
                                  ms.ministry?.name || "소속"
                                )
                              }
                              disabled={deletingMembershipId === ms.id}
                              className="px-3 py-1 text-xs bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white"
                            >
                              {deletingMembershipId === ms.id
                                ? "삭제 중..."
                                : "삭제"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground mt-4 pt-4 border-t">
                      등록된 소속 정보가 없습니다.
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 년도별 정보 탭 - 데스크톱: 테이블 형태 */}
          <div className="hidden md:block bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      사진
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      이름
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      년도
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      소속
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      직분
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      리더
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      학년
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => {
                    const memberships = member.allMemberships || [];
                    const filteredMemberships =
                      getFilteredMemberships(memberships);
                    const sortedMemberships = [...filteredMemberships].sort(
                      (a, b) => (b.year || 0) - (a.year || 0)
                    );

                    if (sortedMemberships.length === 0) {
                      return (
                        <tr key={member.id} className="border-t bg-card">
                          <td className="px-4 py-3">
                            <Link to={`/yerim/member/${member.id}`}>
                              {member.photo ? (
                                <img
                                  src={member.photo}
                                  alt={member.name || "회원 사진"}
                                  className="w-12 h-12 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-sm font-semibold text-gray-700">
                                  {member.name ? member.name[0] : "?"}
                                </div>
                              )}
                            </Link>
                          </td>
                          <td className="px-4 py-3 font-medium">
                            <Link
                              to={`/yerim/member/${member.id}`}
                              className="hover:text-primary hover:underline transition-colors"
                            >
                              {member.name || "이름 없음"}
                              {isTeacherInNonChoir(member) && (
                                <span className="ml-2 text-sm text-primary font-normal">
                                  교사
                                </span>
                              )}
                            </Link>
                          </td>
                          <td
                            colSpan="6"
                            className="px-4 py-3 text-sm text-muted-foreground"
                          >
                            등록된 소속 정보가 없습니다.
                          </td>
                        </tr>
                      );
                    }

                    return sortedMemberships.map((ms, index) => (
                      <tr
                        key={`${member.id}-${ms.id}`}
                        className={`border-t hover:bg-accent transition-colors ${
                          index === 0 ? "bg-card" : "bg-muted/30"
                        }`}
                      >
                        {index === 0 && (
                          <>
                            <td
                              rowSpan={sortedMemberships.length}
                              className="px-4 py-3"
                            >
                              <Link to={`/yerim/member/${member.id}`}>
                                {member.photo ? (
                                  <img
                                    src={member.photo}
                                    alt={member.name || "회원 사진"}
                                    className="w-12 h-12 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-sm font-semibold text-gray-700">
                                    {member.name ? member.name[0] : "?"}
                                  </div>
                                )}
                              </Link>
                            </td>
                            <td
                              rowSpan={sortedMemberships.length}
                              className="px-4 py-3 font-medium"
                            >
                              <Link
                                to={`/yerim/member/${member.id}`}
                                className="hover:text-primary hover:underline transition-colors"
                              >
                                {member.name || "이름 없음"}
                                {isTeacherInNonChoir(member) && (
                                  <span className="ml-2 text-sm text-primary font-normal">
                                    교사
                                  </span>
                                )}
                              </Link>
                            </td>
                          </>
                        )}
                        <td className="px-4 py-3 text-sm font-medium">
                          {ms.year || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {ms.ministry?.name || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {formatPosition(ms.position, ms.grade) || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {ms.leader || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {/* 학생일 경우 학년과 반 표시, 교사일 경우 반 표시 */}
                          {ms.position &&
                          [
                            "유년부",
                            "초등부",
                            "중학생",
                            "고등학생",
                            "대학생",
                          ].includes(ms.position) &&
                          ms.grade
                            ? `${ms.grade}학년${
                                ms.class ? ` / ${ms.class}반` : ""
                              }`
                            : ms.leader === "교사" && (ms.grade || ms.class)
                            ? `${ms.grade ? `${ms.grade}학년` : ""}${
                                ms.grade && ms.class ? " / " : ""
                              }${ms.class ? `${ms.class}반` : ""}`
                            : ms.class
                            ? `${ms.class}반`
                            : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() =>
                              handleDeleteMembership(
                                ms.id,
                                member.name,
                                ms.year,
                                ms.ministry?.name || "소속"
                              )
                            }
                            disabled={deletingMembershipId === ms.id}
                            className="px-3 py-1 text-xs bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white"
                          >
                            {deletingMembershipId === ms.id
                              ? "삭제 중..."
                              : "삭제"}
                          </button>
                        </td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 년도별 가입 모달 */}
      {showJoinModal && selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">
              {selectedMember.name} - 부서가입하기
            </h3>

            <div className="space-y-4">
              {/* 년도 선택 - 버튼 */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  년도 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {[new Date().getFullYear(), new Date().getFullYear() + 1].map(
                    (year) => (
                      <button
                        key={year}
                        type="button"
                        onClick={() =>
                          setJoinFormData({ ...joinFormData, year })
                        }
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                          joinFormData.year === year
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
              <div>
                <label className="block text-sm font-medium mb-2">
                  소속 <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {ministryCodes.map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() =>
                        setJoinFormData({
                          ...joinFormData,
                          ministryCode: code,
                          part: "SOPRANO", // 소속 변경 시 파트 초기화
                        })
                      }
                      className={`px-4 py-2 rounded-lg border transition-colors text-sm ${
                        joinFormData.ministryCode === code
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
              <div>
                <label className="block text-sm font-medium mb-2">
                  직분 <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {POSITIONS.map((position) => (
                    <button
                      key={position}
                      type="button"
                      onClick={() =>
                        setJoinFormData({
                          ...joinFormData,
                          position,
                          grade: "", // 직분 변경 시 학년 초기화
                        })
                      }
                      className={`px-4 py-2 rounded-lg border transition-colors text-sm ${
                        joinFormData.position === position
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
              {(joinFormData.ministryCode === "시온성가대" ||
                joinFormData.ministryCode === "예루살렘성가대") && (
                <div>
                  <label className="block text-sm font-medium mb-2">파트</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PARTS.map((part) => (
                      <button
                        key={part}
                        type="button"
                        onClick={() =>
                          setJoinFormData({ ...joinFormData, part })
                        }
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                          joinFormData.part === part
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

              {(joinFormData.position === "유년부" ||
                joinFormData.position === "초등부" ||
                joinFormData.position === "중학생" ||
                joinFormData.position === "고등학생" ||
                joinFormData.position === "대학생") && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    학년 <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      let grades = [];
                      if (joinFormData.position === "유년부") {
                        grades = [1, 2, 3]; // 유년부 1~3
                      } else if (joinFormData.position === "초등부") {
                        grades = [4, 5, 6]; // 초등부 4~6
                      } else if (
                        joinFormData.position === "중학생" ||
                        joinFormData.position === "고등학생"
                      ) {
                        grades = [1, 2, 3];
                      } else if (joinFormData.position === "대학생") {
                        grades = [1, 2, 3, 4];
                      }
                      return grades.map((grade) => (
                        <button
                          key={grade}
                          type="button"
                          onClick={() =>
                            setJoinFormData({
                              ...joinFormData,
                              grade: grade.toString(),
                            })
                          }
                          className={`px-4 py-2 rounded-lg border transition-colors text-sm btn-sm ${
                            joinFormData.grade === grade.toString()
                              ? "bg-primary btn-sm text-primary-foreground border-primary"
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
              {(joinFormData.position === "유년부" ||
                joinFormData.position === "초등부" ||
                joinFormData.position === "중학생" ||
                joinFormData.position === "고등학생" ||
                joinFormData.position === "대학생") && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    반 (선택사항)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setJoinFormData({ ...joinFormData, class: "" })
                      }
                      className={`px-4 py-2 rounded-lg border transition-colors text-sm ${
                        !joinFormData.class
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
                          setJoinFormData({
                            ...joinFormData,
                            class: classNum.toString(),
                          })
                        }
                        className={`px-4 py-2 rounded-lg border transition-colors text-sm ${
                          joinFormData.class === classNum.toString()
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
              <div>
                <label className="block text-sm font-medium mb-2">
                  리더 (선택사항)
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setJoinFormData({ ...joinFormData, leader: "" })
                    }
                    className={`px-4 py-2 rounded-lg border transition-colors text-sm ${
                      !joinFormData.leader
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
                      onClick={() =>
                        setJoinFormData({ ...joinFormData, leader })
                      }
                      className={`px-4 py-2 rounded-lg border transition-colors text-sm ${
                        joinFormData.leader === leader
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-white border-border hover:bg-accent"
                      }`}
                    >
                      {leader}
                    </button>
                  ))}
                </div>
              </div>

              {/* 에러 메시지 */}
              {joinError && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                  {joinError}
                </div>
              )}

              {/* 버튼 */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleJoinMembership}
                  disabled={joining}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {joining ? "가입 중..." : "가입하기"}
                </button>
                <button
                  onClick={handleCloseJoinModal}
                  className="px-4 py-2 border rounded-lg hover:bg-accent transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default YerimMemberList;
