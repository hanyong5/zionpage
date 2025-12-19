import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ko } from "date-fns/locale/ko";
import supabase from "../../utils/supabase";
import { source_subtype } from "./pointconst";

function PointList() {
  const [memberPoints, setMemberPoints] = useState([]);
  const [ministries, setMinistries] = useState([]);
  const [selectedMinistry, setSelectedMinistry] = useState("전체");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [pointLedgers, setPointLedgers] = useState([]);
  const [loadingLedgers, setLoadingLedgers] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showPointModal, setShowPointModal] = useState(false);
  const [pointAmount, setPointAmount] = useState("");
  const [pointSubtype, setPointSubtype] = useState("");
  const [pointMemo, setPointMemo] = useState("");
  const [processingPoints, setProcessingPoints] = useState(false);

  // 부서 목록 가져오기
  useEffect(() => {
    const fetchMinistries = async () => {
      try {
        const { data, error: ministryError } = await supabase
          .from("ministry")
          .select("id, name")
          .order("name");

        if (ministryError) {
          throw ministryError;
        }

        setMinistries(data || []);
      } catch (err) {
        console.error("부서 목록 가져오기 오류:", err);
      }
    };

    fetchMinistries();
  }, []);

  // 회원 포인트 데이터 가져오기
  const fetchMemberPoints = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 현재 년도 기준으로 membership에서 모든 회원 가져오기
      const currentYear = new Date().getFullYear();

      // membership 테이블에서 현재 년도, is_active=true인 모든 회원 가져오기
      const { data: allMemberships, error: membershipError } = await supabase
        .from("membership")
        .select("member_id, ministry_id, year")
        .eq("year", currentYear)
        .eq("is_active", true);

      if (membershipError) {
        throw membershipError;
      }

      if (!allMemberships || allMemberships.length === 0) {
        setMemberPoints([]);
        setLoading(false);
        return;
      }

      // 모든 고유한 member_id 수집
      const memberIds = [
        ...new Set(allMemberships.map((m) => m.member_id).filter(Boolean)),
      ];

      // members 테이블에서 일괄 조회
      const { data: membersData, error: membersError } = await supabase
        .from("members")
        .select("id, name, phone, photo")
        .in("id", memberIds);

      if (membersError) {
        throw membersError;
      }

      // member_id -> member 정보 매핑 생성
      const membersMap = {};
      (membersData || []).forEach((member) => {
        membersMap[member.id] = member;
      });

      // member_points에서 포인트 정보 일괄 조회
      const { data: pointsData, error: pointsError } = await supabase
        .from("member_points")
        .select("id, balace")
        .in("id", memberIds);

      if (pointsError) {
        console.error("포인트 조회 오류:", pointsError);
      }

      // member_id -> 포인트 정보 매핑 생성
      const pointsMap = {};
      (pointsData || []).forEach((point) => {
        pointsMap[point.id] = point.balace || 0;
      });

      // ministry_id 목록 수집
      const ministryIds = [
        ...new Set(allMemberships.map((m) => m.ministry_id).filter(Boolean)),
      ];

      // ministry 정보 일괄 조회
      const { data: ministriesData, error: ministriesError } = await supabase
        .from("ministry")
        .select("id, name")
        .in("id", ministryIds);

      if (ministriesError) {
        console.error("ministry 조회 오류:", ministriesError);
      }

      // ministry_id -> ministry 정보 매핑 생성
      const ministriesMap = {};
      (ministriesData || []).forEach((ministry) => {
        ministriesMap[ministry.id] = ministry;
      });

      // member_id -> ministry_id 매핑 생성 (현재 년도 기준, 각 회원의 첫 번째 membership 사용)
      const memberMinistryMap = {};
      allMemberships.forEach((membership) => {
        if (!memberMinistryMap[membership.member_id]) {
          memberMinistryMap[membership.member_id] = membership.ministry_id;
        }
      });

      // 회원 리스트 생성 (membership 기준)
      const membersWithInfo = memberIds.map((memberId) => {
        const member = membersMap[memberId];
        const ministryId = memberMinistryMap[memberId];
        const ministry = ministryId ? ministriesMap[ministryId] : null;
        const balance = pointsMap[memberId] || 0;

        return {
          memberId: memberId,
          memberName: member?.name || "알 수 없음",
          memberPhone: member?.phone || "",
          memberPhoto: member?.photo || null,
          ministryName: ministry?.name || "미소속",
          ministryId: ministryId || null,
          balance: balance,
        };
      });

      setMemberPoints(membersWithInfo);
    } catch (err) {
      console.error("회원 포인트 가져오기 오류:", err);
      setError(err.message || "회원 포인트를 가져오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  // 회원 포인트 데이터 가져오기
  useEffect(() => {
    fetchMemberPoints();
  }, [fetchMemberPoints]);

  // 부서별로 그룹화된 회원 포인트 리스트
  const memberPointsByMinistry = useMemo(() => {
    const grouped = {};
    memberPoints.forEach((point) => {
      const ministryName = point.ministryName || "미소속";
      if (!grouped[ministryName]) {
        grouped[ministryName] = [];
      }
      grouped[ministryName].push(point);
    });
    return grouped;
  }, [memberPoints]);

  // 선택한 부서에 따라 필터링된 회원 포인트 리스트
  const filteredMemberPoints = useMemo(() => {
    if (selectedMinistry === "전체") {
      return memberPoints;
    }
    return memberPoints.filter(
      (point) => point.ministryName === selectedMinistry
    );
  }, [memberPoints, selectedMinistry]);

  // 부서별 통계 계산
  const ministryStats = useMemo(() => {
    const stats = {};
    memberPoints.forEach((point) => {
      const ministryName = point.ministryName || "미소속";
      if (!stats[ministryName]) {
        stats[ministryName] = {
          count: 0,
          totalBalance: 0,
        };
      }
      stats[ministryName].count++;
      stats[ministryName].totalBalance += point.balance || 0;
    });
    return stats;
  }, [memberPoints]);

  // 회원 클릭 시 포인트 적립 리스트 가져오기
  const handleMemberClick = async (memberId) => {
    setSelectedMember(memberId);
    setLoadingLedgers(true);
    setPointLedgers([]);

    try {
      const { data, error: ledgerError } = await supabase
        .from("point_ledger")
        .select("*")
        .eq("member_id", memberId)
        .order("occurred_at", { ascending: false });

      if (ledgerError) {
        throw ledgerError;
      }

      setPointLedgers(data || []);
    } catch (err) {
      console.error("포인트 적립 리스트 가져오기 오류:", err);
      setError(
        err.message || "포인트 적립 리스트를 가져오는 중 오류가 발생했습니다."
      );
    } finally {
      setLoadingLedgers(false);
    }
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setSelectedMember(null);
    setPointLedgers([]);
  };

  // 체크박스 토글
  const handleToggleCheck = (memberId) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  };

  // 전체 선택/해제
  const handleSelectAll = (points) => {
    const allIds = points.map((p) => p.memberId);
    const allSelected = allIds.every((id) => selectedIds.has(id));

    if (allSelected) {
      // 모두 선택되어 있으면 모두 해제
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        allIds.forEach((id) => newSet.delete(id));
        return newSet;
      });
    } else {
      // 모두 선택
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        allIds.forEach((id) => newSet.add(id));
        return newSet;
      });
    }
  };

  // 포인트 추가/차감 모달 열기
  const handleOpenPointModal = () => {
    if (selectedIds.size === 0) {
      alert("포인트를 추가하거나 차감할 회원을 선택해주세요.");
      return;
    }
    setShowPointModal(true);
    setPointAmount("");
    setPointSubtype("");
    setPointMemo("");
  };

  // 포인트 추가/차감 처리
  const handleProcessPoints = async (isAdd) => {
    if (!pointSubtype) {
      alert("유형을 선택해주세요.");
      return;
    }

    const amount = parseFloat(pointAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("올바른 포인트를 입력해주세요.");
      return;
    }

    const delta = isAdd ? amount : -amount;

    if (
      !confirm(
        `선택한 ${selectedIds.size}명에게 ${
          isAdd ? "추가" : "차감"
        } ${amount}점을 지급하시겠습니까?\n유형: ${pointSubtype}`
      )
    ) {
      return;
    }

    setProcessingPoints(true);
    setError(null);

    try {
      const selectedMembers = memberPoints.filter((p) =>
        selectedIds.has(p.memberId)
      );

      let successCount = 0;
      let failCount = 0;
      const failReasons = [];

      for (const member of selectedMembers) {
        try {
          // 1. member_points에서 현재 balance 조회
          const { data: memberPoint, error: pointError } = await supabase
            .from("member_points")
            .select("id, balace")
            .eq("id", member.memberId)
            .maybeSingle();

          if (pointError && pointError.code !== "PGRST116") {
            throw pointError;
          }

          const currentBalance = memberPoint?.balace || 0;
          const newBalance = currentBalance + delta;

          // 2. point_ledger에 레코드 생성
          const { error: ledgerError } = await supabase
            .from("point_ledger")
            .insert({
              member_id: member.memberId,
              delta: delta,
              balance_after: newBalance,
              reason: isAdd ? "포인트 추가" : "포인트 차감",
              source_type: "보너스",
              source_subtype: pointSubtype,
              source_id: null,
              memo: pointMemo || `${pointSubtype} ${isAdd ? "추가" : "차감"}`,
              occurred_at: new Date().toISOString(),
            });

          if (ledgerError) {
            throw ledgerError;
          }

          // 3. member_points 업데이트 또는 생성
          if (memberPoint) {
            const { error: updatePointError } = await supabase
              .from("member_points")
              .update({
                balace: newBalance,
                updated_at: new Date().toISOString(),
              })
              .eq("id", member.memberId);

            if (updatePointError) {
              throw updatePointError;
            }
          } else {
            const { error: insertPointError } = await supabase
              .from("member_points")
              .insert({
                id: member.memberId,
                balace: newBalance,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });

            if (insertPointError) {
              throw insertPointError;
            }
          }

          successCount++;
        } catch (err) {
          console.error(`포인트 처리 오류 (회원 ID: ${member.memberId}):`, err);
          failReasons.push(
            `${member.memberName}: ${err.message || "처리 실패"}`
          );
          failCount++;
        }
      }

      // 결과 메시지
      if (successCount > 0) {
        let message = `${successCount}명에게 포인트가 ${
          isAdd ? "추가" : "차감"
        }되었습니다.`;
        if (failCount > 0) {
          message += `\n\n${failCount}명 실패:\n${failReasons.join("\n")}`;
        }
        alert(message);
        // 데이터 새로고침
        await fetchMemberPoints();
        // 선택 해제
        setSelectedIds(new Set());
        // 모달 닫기
        setShowPointModal(false);
      } else {
        alert(
          `포인트 처리에 실패했습니다.\n\n실패 사유:\n${failReasons.join("\n")}`
        );
      }
    } catch (err) {
      console.error("포인트 처리 오류:", err);
      setError(err.message || "포인트 처리 중 오류가 발생했습니다.");
    } finally {
      setProcessingPoints(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div>로딩 중...</div>
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

  const currentYear = new Date().getFullYear();

  return (
    <div className="p-3 sm:p-4 min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto">
        {/* 상단 헤더 */}
        <div className="mb-4">
          <CardTitle className="text-xl sm:text-2xl font-bold mb-4">
            {currentYear}년 회원 포인트 리스트
          </CardTitle>

          {/* 부서 탭 메뉴 */}
          <div className="flex flex-wrap gap-2 mb-4 border-b">
            <button
              onClick={() => setSelectedMinistry("전체")}
              className={`px-4 py-2 font-medium transition-colors rounded-t-lg ${
                selectedMinistry === "전체"
                  ? "bg-primary text-primary-foreground border-b-2 border-primary"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              전체 ({memberPoints.length})
            </button>
            {ministries.map((ministry) => {
              const count = ministryStats[ministry.name]?.count || 0;
              return (
                <button
                  key={ministry.id}
                  onClick={() => setSelectedMinistry(ministry.name)}
                  className={`px-4 py-2 font-medium transition-colors rounded-t-lg ${
                    selectedMinistry === ministry.name
                      ? "bg-primary text-primary-foreground border-b-2 border-primary"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {ministry.name} ({count})
                </button>
              );
            })}
          </div>

          {/* 포인트 추가/차감 버튼 */}
          {selectedIds.size > 0 && (
            <div className="mb-4 flex items-center gap-2">
              <button
                onClick={handleOpenPointModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                선택한 {selectedIds.size}명 포인트 추가/차감
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
              >
                선택 해제
              </button>
            </div>
          )}
        </div>

        {/* 회원 포인트 리스트 */}
        {selectedMinistry === "전체" ? (
          // 전체 선택 시 부서별로 그룹화하여 표시
          Object.keys(memberPointsByMinistry).length === 0 ? (
            <div className="text-center text-muted-foreground py-8 bg-white rounded-lg">
              {currentYear}년 회원 포인트가 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(memberPointsByMinistry)
                .sort(([a], [b]) => {
                  // 부서명으로 정렬 (미소속은 마지막)
                  if (a === "미소속") return 1;
                  if (b === "미소속") return -1;
                  return a.localeCompare(b);
                })
                .map(([ministryName, points]) => {
                  const ministryCounts = ministryStats[ministryName] || {
                    count: 0,
                    totalBalance: 0,
                  };
                  return (
                    <Card key={ministryName} className="bg-white">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={points.every((p) =>
                                selectedIds.has(p.memberId)
                              )}
                              onChange={() => handleSelectAll(points)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-5 h-5 cursor-pointer"
                            />
                            <CardTitle className="text-lg font-bold">
                              {ministryName}
                            </CardTitle>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {ministryCounts.count}명 / 총{" "}
                            {ministryCounts.totalBalance}점
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {points
                            .sort((a, b) => (b.balance || 0) - (a.balance || 0))
                            .map((point) => (
                              <div
                                key={point.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors"
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.has(point.memberId)}
                                    onChange={() =>
                                      handleToggleCheck(point.memberId)
                                    }
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-5 h-5 cursor-pointer shrink-0"
                                  />
                                  <div
                                    onClick={() =>
                                      handleMemberClick(point.memberId)
                                    }
                                    className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                                  >
                                    {point.memberPhoto ? (
                                      <img
                                        src={point.memberPhoto}
                                        alt={point.memberName}
                                        className="w-8 h-8 rounded-full object-cover shrink-0"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-semibold text-gray-700 shrink-0">
                                        {point.memberName?.[0] || "?"}
                                      </div>
                                    )}
                                    <span className="font-medium">
                                      {point.memberName}
                                    </span>
                                    {point.updated_at && (
                                      <div className="text-xs text-muted-foreground mt-1 ml-2">
                                        최종 업데이트:{" "}
                                        {format(
                                          new Date(point.updated_at),
                                          "yyyy년 MM월 dd일 HH:mm",
                                          { locale: ko }
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 ml-4">
                                  <div className="text-right">
                                    <div className="text-lg font-bold text-blue-600">
                                      {point.balance || 0}점
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )
        ) : filteredMemberPoints.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 bg-white rounded-lg">
            {selectedMinistry}의 {currentYear}년 회원 포인트가 없습니다.
          </div>
        ) : (
          <div className="space-y-2">
            {/* 전체 선택 체크박스 */}
            {filteredMemberPoints.length > 0 && (
              <div className="mb-2 flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
                <input
                  type="checkbox"
                  checked={filteredMemberPoints.every((p) =>
                    selectedIds.has(p.memberId)
                  )}
                  onChange={() => handleSelectAll(filteredMemberPoints)}
                  className="w-5 h-5 cursor-pointer"
                />
                <span className="text-sm font-medium">
                  전체 선택 ({filteredMemberPoints.length}명)
                </span>
              </div>
            )}
            {filteredMemberPoints
              .sort((a, b) => (b.balance || 0) - (a.balance || 0))
              .map((point) => (
                <Card key={point.id} className="bg-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(point.memberId)}
                          onChange={() => handleToggleCheck(point.memberId)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-5 h-5 cursor-pointer shrink-0"
                        />
                        <div
                          onClick={() => handleMemberClick(point.memberId)}
                          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                        >
                          {point.memberPhoto ? (
                            <img
                              src={point.memberPhoto}
                              alt={point.memberName}
                              className="w-10 h-10 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-lg font-semibold text-gray-700 shrink-0">
                              {point.memberName?.[0] || "?"}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">
                                {point.memberName}
                              </span>
                            </div>
                            {point.updated_at && (
                              <div className="text-xs text-muted-foreground mt-1">
                                최종 업데이트:{" "}
                                {format(
                                  new Date(point.updated_at),
                                  "yyyy년 MM월 dd일 HH:mm",
                                  { locale: ko }
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 ml-4">
                        <div className="text-right">
                          <div className="text-lg font-bold text-blue-600">
                            {point.balance || 0}점
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>

      {/* 포인트 적립 리스트 모달 */}
      {selectedMember && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 - 고정 */}
            <div className="p-6 border-b shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold">
                  {memberPoints.find((p) => p.memberId === selectedMember)
                    ?.memberName || "회원"}{" "}
                  포인트 적립 리스트
                </CardTitle>
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 border rounded-lg font-medium hover:bg-accent transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>

            {/* 포인트 적립 리스트 - 스크롤 가능 */}
            <div className="p-6 overflow-y-auto flex-1">
              {loadingLedgers ? (
                <div className="text-center py-8">로딩 중...</div>
              ) : pointLedgers.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  포인트 적립 내역이 없습니다.
                </div>
              ) : (
                <div className="space-y-2">
                  {pointLedgers.map((ledger) => (
                    <Card key={ledger.id} className="bg-white">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {ledger.reason && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                                  {ledger.reason}
                                </span>
                              )}
                              {ledger.source_type && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                                  {ledger.source_type}
                                </span>
                              )}
                            </div>
                            {ledger.memo && (
                              <div className="text-sm text-muted-foreground mb-1">
                                {ledger.memo}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              {format(
                                new Date(ledger.occurred_at),
                                "yyyy년 MM월 dd일 HH:mm",
                                { locale: ko }
                              )}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div
                              className={`text-lg font-bold ${
                                (ledger.delta || 0) >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {ledger.delta >= 0 ? "+" : ""}
                              {ledger.delta || 0}점
                            </div>
                            <div className="text-sm text-muted-foreground">
                              잔액: {ledger.balance_after || 0}점
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 포인트 추가/차감 모달 */}
      {showPointModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowPointModal(false)}
        >
          <div
            className="bg-white rounded-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6">
              <CardTitle className="text-xl font-bold mb-2">
                포인트 추가/차감
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                선택한 {selectedIds.size}명에게 포인트를 추가하거나 차감합니다.
              </p>
            </div>

            <div className="space-y-4">
              {/* 유형 선택 */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  유형 <span className="text-red-500">*</span>
                </label>
                <select
                  value={pointSubtype}
                  onChange={(e) => setPointSubtype(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">유형 선택</option>
                  {source_subtype.map((subtype) => (
                    <option key={subtype} value={subtype}>
                      {subtype}
                    </option>
                  ))}
                </select>
              </div>

              {/* 포인트 입력 */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  포인트 <span className="text-red-500">*</span>
                </label>
                {/* 빠른 선택 버튼 */}
                <div className="flex gap-2 mb-2">
                  {[1, 5, 10, 100, 200].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => {
                        const currentAmount = parseFloat(pointAmount) || 0;
                        setPointAmount((currentAmount + amount).toString());
                      }}
                      className="flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                      +{amount}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={pointAmount}
                  onChange={(e) => setPointAmount(e.target.value)}
                  placeholder="포인트를 입력하세요"
                  min="1"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* 메모 */}
              <div>
                <label className="block text-sm font-medium mb-2">메모</label>
                <textarea
                  value={pointMemo}
                  onChange={(e) => setPointMemo(e.target.value)}
                  placeholder="메모를 입력하세요 (선택사항)"
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* 버튼 */}
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => handleProcessPoints(true)}
                  disabled={processingPoints || !pointSubtype || !pointAmount}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {processingPoints ? "처리 중..." : "포인트 추가"}
                </button>
                <button
                  onClick={() => handleProcessPoints(false)}
                  disabled={processingPoints || !pointSubtype || !pointAmount}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {processingPoints ? "처리 중..." : "포인트 차감"}
                </button>
              </div>

              {/* 취소 버튼 */}
              <button
                onClick={() => {
                  setShowPointModal(false);
                  setPointAmount("");
                  setPointSubtype("");
                  setPointMemo("");
                }}
                className="w-full px-4 py-2 border rounded-lg font-medium hover:bg-accent transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PointList;
