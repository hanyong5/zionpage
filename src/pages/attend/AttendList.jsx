import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ko } from "date-fns/locale/ko";
import supabase from "../../utils/supabase";
import { reason, point, source_type } from "../point/pointconst";

function AttendList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [attendances, setAttendances] = useState([]);
  const [ministries, setMinistries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingMinistry, setDeletingMinistry] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [memos, setMemos] = useState({});
  const [updating, setUpdating] = useState(false);
  const [confirmingAttendance, setConfirmingAttendance] = useState(null);

  // URL에서 날짜 파라미터 가져오기
  const dateParam = searchParams.get("date");
  const selectedDate = dateParam ? new Date(dateParam) : new Date();

  // 날짜를 YYYY-MM-DD 형식으로 변환
  const dateString = format(selectedDate, "yyyy-MM-dd");

  // 날짜 변경 핸들러
  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setSearchParams({ date: newDate });
  };

  // 출석부 데이터 가져오기 함수
  const fetchAttendances = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // attend 테이블에서 해당 날짜의 출석부 가져오기 (member 정보 포함)
      const { data, error: attendError } = await supabase
        .from("attend")
        .select(
          `
            *,
            member:members(id, name, phone),
            ministry:ministry(id, name)
          `
        )
        .eq("attendance_date", dateString)
        .order("ministry_id");

      if (attendError) {
        throw attendError;
      }

      // ministry 정보 가져오기
      const { data: ministryData, error: ministryError } = await supabase
        .from("ministry")
        .select("id, name")
        .order("name");

      if (ministryError) {
        throw ministryError;
      }

      setMinistries(ministryData || []);

      // 현재 년도
      const currentYear = new Date().getFullYear();

      // 각 출석부의 membership 정보 가져오기
      const attendancesWithInfo = await Promise.all(
        (data || []).map(async (attendance) => {
          let membershipData = null;

          // membership_id가 있으면 해당 membership 사용, 없으면 기존 방식으로 조회
          if (attendance.membership_id) {
            const { data: membership, error: membershipError } = await supabase
              .from("membership")
              .select("part, grade, position, class, id")
              .eq("id", attendance.membership_id)
              .maybeSingle();

            if (!membershipError && membership) {
              membershipData = membership;
            }
          }

          // membership_id가 없거나 조회 실패 시 기존 방식으로 조회 및 업데이트
          if (!membershipData) {
            const { data: membership, error: membershipError } = await supabase
              .from("membership")
              .select("id, part, grade, position, class")
              .eq("member_id", attendance.member_id)
              .eq("ministry_id", attendance.ministry_id)
              .eq("year", currentYear)
              .eq("is_active", true)
              .order("year", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (!membershipError && membership) {
              membershipData = membership;

              // 기존 출석부 레코드에 membership_id 업데이트
              if (membership.id && !attendance.membership_id) {
                await supabase
                  .from("attend")
                  .update({ membership_id: membership.id })
                  .eq("id", attendance.id);
              }
            }
          }

          return {
            ...attendance,
            memberName: attendance.member?.name || "알 수 없음",
            memberPhone: attendance.member?.phone || "",
            ministryName: attendance.ministry?.name || "알 수 없음",
            part: membershipData?.part || null,
            grade: membershipData?.grade || null,
            position: membershipData?.position || null,
            class: membershipData?.class || null,
            membership_id:
              membershipData?.id || attendance.membership_id || null,
          };
        })
      );

      setAttendances(attendancesWithInfo);

      // 메모 초기화
      const initialMemos = {};
      attendancesWithInfo.forEach((attendance) => {
        initialMemos[attendance.id] = attendance.memo || "";
      });
      setMemos(initialMemos);
    } catch (err) {
      console.error("출석부 가져오기 오류:", err);
      setError(err.message || "출석부를 가져오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [dateString]);

  // 출석부 데이터 가져오기
  useEffect(() => {
    fetchAttendances();
  }, [fetchAttendances]);

  // 부서별로 그룹화하고, round별로 세부 그룹화, 그 안에서 성가대는 파트별, 다른 부서는 학년별로 그룹화
  const attendancesByMinistry = useMemo(() => {
    const grouped = {};
    attendances.forEach((attendance) => {
      const ministryName = attendance.ministryName || "알 수 없음";
      const round = attendance.round || "1";

      if (!grouped[ministryName]) {
        grouped[ministryName] = {};
      }

      // round별로 그룹화
      if (!grouped[ministryName][round]) {
        grouped[ministryName][round] = {};
      }

      // 성가대인 경우 파트별로 그룹화
      if (ministryName === "시온성가대" || ministryName === "예루살렘성가대") {
        const part = attendance.part || "기타";
        if (!grouped[ministryName][round][part]) {
          grouped[ministryName][round][part] = [];
        }
        grouped[ministryName][round][part].push(attendance);
      } else {
        // 다른 부서는 학년별로 그룹화하고, 각 학년 내에서 반별로 그룹화
        const grade = attendance.grade ? `${attendance.grade}학년` : "기타";
        const classNum = attendance.class ? `${attendance.class}반` : "기타";

        if (!grouped[ministryName][round][grade]) {
          grouped[ministryName][round][grade] = {};
        }

        if (!grouped[ministryName][round][grade][classNum]) {
          grouped[ministryName][round][grade][classNum] = [];
        }

        grouped[ministryName][round][grade][classNum].push(attendance);
      }
    });
    return grouped;
  }, [attendances]);

  // Round별 출석부 삭제 핸들러
  const handleDeleteMinistryAttendance = async (
    ministryName,
    ministryId,
    round
  ) => {
    // ministryId 유효성 검사
    if (!ministryId || ministryId === "undefined") {
      setError("부서 정보가 올바르지 않습니다.");
      return;
    }

    if (
      !confirm(`${ministryName}의 Round ${round} 출석부를 삭제하시겠습니까?`)
    ) {
      return;
    }

    const deleteKey = `${ministryName}-${round}`;
    setDeletingMinistry(deleteKey);
    setError(null);

    try {
      // is_confirmed가 0인 경우에만 삭제 가능
      // 먼저 삭제 가능한 레코드가 있는지 확인
      const { data: checkData, error: checkError } = await supabase
        .from("attend")
        .select("id")
        .eq("attendance_date", dateString)
        .eq("ministry_id", Number(ministryId))
        .eq("round", round)
        .eq("is_confirmed", 0)
        .limit(1);

      if (checkError) {
        throw checkError;
      }

      if (!checkData || checkData.length === 0) {
        setError(
          "확인된 출석부는 삭제할 수 없습니다. (is_confirmed가 1인 경우)"
        );
        setDeletingMinistry(null);
        return;
      }

      // 해당 날짜, ministry_id, round로 출석 레코드 삭제 (is_confirmed = 0인 것만)
      const { error: deleteError } = await supabase
        .from("attend")
        .delete()
        .eq("attendance_date", dateString)
        .eq("ministry_id", Number(ministryId)) // 명시적으로 숫자로 변환
        .eq("round", round)
        .eq("is_confirmed", 0);

      if (deleteError) {
        throw deleteError;
      }

      // 성공 시 리스트 새로고침
      const fetchAttendances = async () => {
        try {
          const { data, error: attendError } = await supabase
            .from("attend")
            .select(
              `
            *,
            member:members(id, name, phone),
            ministry:ministry(id, name)
          `
            )
            .eq("attendance_date", dateString)
            .order("ministry_id");

          if (attendError) {
            throw attendError;
          }

          // 현재 년도
          const currentYear = new Date().getFullYear();

          // 각 출석부의 membership 정보 가져오기
          const attendancesWithInfo = await Promise.all(
            (data || []).map(async (attendance) => {
              // 해당 회원의 현재 년도 membership 정보 가져오기
              const { data: membershipData, error: membershipError } =
                await supabase
                  .from("membership")
                  .select("part, grade, position, class")
                  .eq("member_id", attendance.member_id)
                  .eq("ministry_id", attendance.ministry_id)
                  .in("year", [currentYear, currentYear + 1])
                  .eq("is_active", true)
                  .order("year", { ascending: false })
                  .limit(1)
                  .maybeSingle();

              return {
                ...attendance,
                memberName: attendance.member?.name || "알 수 없음",
                memberPhone: attendance.member?.phone || "",
                ministryName: attendance.ministry?.name || "알 수 없음",
                part: membershipData?.part || null,
                grade: membershipData?.grade || null,
                position: membershipData?.position || null,
              };
            })
          );

          setAttendances(attendancesWithInfo);
        } catch (err) {
          console.error("출석부 가져오기 오류:", err);
          setError(err.message || "출석부를 가져오는 중 오류가 발생했습니다.");
        }
      };

      await fetchAttendances();
    } catch (err) {
      console.error("출석부 삭제 오류:", err);
      setError(err.message || "출석부 삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingMinistry(null);
    }
  };

  // 체크박스 토글
  const handleToggleCheck = (id) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // 전체 선택/해제
  const handleSelectAll = (ministryAttendances) => {
    const allIds = ministryAttendances.map((a) => a.id);
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

  // 메모 변경 핸들러
  const handleMemoChange = (id, value) => {
    setMemos((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  // 출석확정 핸들러 (해당 소속의 출석자들에게 포인트 지급 및 is_confirmed 업데이트)
  const handleConfirmAttendance = async (ministryName, ministryId) => {
    if (
      !confirm(
        `${ministryName}의 출석/지각/결석 상태인 회원들에게 포인트를 지급하고 출석을 확정하시겠습니까?\n(출석: 20점, 지각: 10점, 결석: 5점)`
      )
    ) {
      return;
    }

    const confirmKey = `${ministryName}`;
    setConfirmingAttendance(confirmKey);
    setError(null);

    try {
      // 해당 날짜, ministry_id, status가 "출석", "지각", "결석"이고 is_confirmed가 0인 출석부 조회 (모든 round 포함)
      const { data: attendances, error: attendError } = await supabase
        .from("attend")
        .select("id, member_id, status, round, member:members(id, name)")
        .eq("attendance_date", dateString)
        .eq("ministry_id", Number(ministryId))
        .in("status", ["출석", "지각", "결석"])
        .eq("is_confirmed", 0); // 아직 확정되지 않은 것만

      if (attendError) {
        throw attendError;
      }

      if (!attendances || attendances.length === 0) {
        alert(
          "확정할 출석 상태인 회원이 없습니다. (이미 확정되었거나 출석/지각/결석 상태가 아닙니다)"
        );
        setConfirmingAttendance(null);
        return;
      }

      let successCount = 0;
      let failCount = 0;
      const failReasons = []; // 실패 사유 저장

      // 각 출석자에게 포인트 지급 및 is_confirmed 업데이트 (for문으로 전체 처리)
      console.log(`출석확정 대상: ${attendances.length}명`);

      for (let i = 0; i < attendances.length; i++) {
        const attendance = attendances[i];
        const memberName = attendance.member?.name || "알 수 없음";

        if (!attendance.member_id) {
          const reason = `${memberName}: member_id가 없음`;
          console.log(`출석 ID ${attendance.id}: ${reason}`);
          failReasons.push(reason);
          failCount++;
          continue;
        }

        try {
          console.log(
            `처리 중: ${i + 1}/${
              attendances.length
            } - ${memberName} (회원 ID: ${attendance.member_id}, 출석 ID: ${
              attendance.id
            })`
          );

          // 1. member_points에서 현재 balance 조회
          const { data: memberPoint, error: pointError } = await supabase
            .from("member_points")
            .select("id, balace")
            .eq("id", attendance.member_id)
            .maybeSingle();

          if (pointError && pointError.code !== "PGRST116") {
            const reason = `${memberName}: 포인트 조회 오류 - ${
              pointError.message ||
              pointError.code ||
              JSON.stringify(pointError)
            }`;
            console.error(
              `포인트 조회 오류 (회원 ID: ${attendance.member_id}):`,
              pointError
            );
            failReasons.push(reason);
            failCount++;
            continue;
          }

          // 현재 balance (없으면 0)
          const currentBalance = memberPoint?.balace || 0;

          // 출석 상태에 따른 포인트 지급 (pointconst.js)
          // 출석: 20점, 결석: 5점, 지각: 10점
          const statusIndex = reason.indexOf(attendance.status);
          const attendancePoint = statusIndex >= 0 ? point[statusIndex] : 0;
          const newBalance = currentBalance + attendancePoint;

          // 2. point_ledger에 레코드 생성
          const { error: ledgerError } = await supabase
            .from("point_ledger")
            .insert({
              member_id: attendance.member_id,
              delta: attendancePoint,
              balance_after: newBalance,
              reason: attendance.status, // "출석", "지각", "결석"
              source_type: "출석",
              source_subtype: null,
              source_id: attendance.id, // attend 테이블의 id
              memo: `${attendance.status} 확인: ${
                attendance.member?.name || "회원"
              }`,
              occurred_at: new Date().toISOString(),
            });

          if (ledgerError) {
            const reason = `${memberName}: 포인트 원장 생성 오류 - ${
              ledgerError.message ||
              ledgerError.code ||
              JSON.stringify(ledgerError)
            }`;
            console.error(
              `포인트 원장 생성 오류 (출석 ID: ${attendance.id}):`,
              ledgerError
            );
            failReasons.push(reason);
            failCount++;
            continue;
          }

          // 3. member_points 업데이트 또는 생성
          if (memberPoint) {
            // 기존 레코드 업데이트
            const { error: updatePointError } = await supabase
              .from("member_points")
              .update({
                balace: newBalance,
                updated_at: new Date().toISOString(),
              })
              .eq("id", attendance.member_id);

            if (updatePointError) {
              const reason = `${memberName}: 포인트 업데이트 오류 - ${
                updatePointError.message ||
                updatePointError.code ||
                JSON.stringify(updatePointError)
              }`;
              console.error(
                `포인트 업데이트 오류 (회원 ID: ${attendance.member_id}):`,
                updatePointError
              );
              failReasons.push(reason);
              failCount++;
              continue;
            }
          } else {
            // 새 레코드 생성
            const { error: insertPointError } = await supabase
              .from("member_points")
              .insert({
                id: attendance.member_id,
                balace: newBalance,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });

            if (insertPointError) {
              const reason = `${memberName}: 포인트 생성 오류 - ${
                insertPointError.message ||
                insertPointError.code ||
                JSON.stringify(insertPointError)
              }`;
              console.error(
                `포인트 생성 오류 (회원 ID: ${attendance.member_id}):`,
                insertPointError
              );
              failReasons.push(reason);
              failCount++;
              continue;
            }
          }

          // 4. attend 테이블의 is_confirmed를 1로 업데이트
          const { error: confirmError } = await supabase
            .from("attend")
            .update({ is_confirmed: 1 })
            .eq("id", attendance.id);

          if (confirmError) {
            const reason = `${memberName}: 출석확정 업데이트 오류 - ${
              confirmError.message ||
              confirmError.code ||
              JSON.stringify(confirmError)
            }`;
            console.error(
              `출석확정 업데이트 오류 (출석 ID: ${attendance.id}):`,
              confirmError
            );
            failReasons.push(reason);
            failCount++;
            continue;
          }

          console.log(
            `성공: ${memberName} (출석 ID ${attendance.id} - 회원 ID ${attendance.member_id})`
          );
          successCount++;
        } catch (pointErr) {
          const reason = `${memberName}: 예외 발생 - ${
            pointErr.message || pointErr.toString()
          }`;
          console.error(
            `포인트 지급 중 오류 (출석 ID: ${attendance.id}):`,
            pointErr
          );
          failReasons.push(reason);
          failCount++;
        }
      }

      console.log(`출석확정 완료: 성공 ${successCount}명, 실패 ${failCount}명`);
      if (failReasons.length > 0) {
        console.log("실패 사유:", failReasons);
      }

      // 결과 메시지
      if (successCount > 0) {
        let message = `${ministryName}의 ${successCount}명에게 포인트가 지급되고 출석이 확정되었습니다.`;
        if (failCount > 0) {
          message += `\n\n${failCount}명 실패:\n${failReasons.join("\n")}`;
        }
        alert(message);
        // 출석부 리스트 새로고침
        await fetchAttendances();
      } else {
        let message = "포인트 지급 및 출석확정에 실패했습니다.";
        if (failReasons.length > 0) {
          message += `\n\n실패 사유:\n${failReasons.join("\n")}`;
        }
        alert(message);
      }
    } catch (err) {
      console.error("출석확정 오류:", err);
      setError(err.message || "출석확정 중 오류가 발생했습니다.");
      alert("출석확정 중 오류가 발생했습니다: " + err.message);
    } finally {
      setConfirmingAttendance(null);
    }
  };

  // 출석 상태 업데이트 핸들러
  const handleUpdateAttendance = async (ministryAttendances, status) => {
    if (selectedIds.size === 0) {
      alert("처리할 항목을 선택해주세요.");
      return;
    }

    setUpdating(true);
    setError(null);

    try {
      const updates = [];

      // 체크된 항목들의 상태를 지정된 상태로 업데이트
      Array.from(selectedIds).forEach((id) => {
        const attendance = ministryAttendances.find((a) => a.id === id);
        if (attendance) {
          updates.push({
            id: id,
            status: status,
            memo: memos[id] || null,
          });
        }
      });

      // 각 항목 업데이트 및 포인트 지급 (출석인 경우)
      for (const update of updates) {
        const attendance = ministryAttendances.find((a) => a.id === update.id);
        if (!attendance) continue;

        // 출석 상태 업데이트
        const { error: updateError } = await supabase
          .from("attend")
          .update({
            status: update.status,
            memo: update.memo,
          })
          .eq("id", update.id);

        if (updateError) {
          throw updateError;
        }

        // 출석 상태 업데이트만 수행 (포인트 지급은 출석확정 버튼에서 별도 처리)
      }

      // 성공 시 리스트 새로고침 (fetchAttendances 함수 재사용)
      await fetchAttendances();

      // 선택 해제
      setSelectedIds(new Set());

      const statusText =
        status === "출석" ? "출석" : status === "결석" ? "결석" : "지각";
      alert(`${updates.length}명의 ${statusText}이 업데이트되었습니다.`);
    } catch (err) {
      console.error("출석 업데이트 오류:", err);
      setError(err.message || "출석 업데이트 중 오류가 발생했습니다.");
    } finally {
      setUpdating(false);
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

  return (
    <div className="p-3 sm:p-4 md:p-6 min-h-screen">
      <Card className="max-w-full sm:max-w-2xl md:max-w-4xl lg:max-w-6xl mx-auto">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold">
              출석부 리스트
            </CardTitle>
            <Link
              to="/attend/calendar"
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/90 transition-colors text-sm sm:text-base"
            >
              달력으로
            </Link>
          </div>
          <div className="mt-2 flex items-center gap-4">
            <div className="text-base sm:text-lg text-muted-foreground">
              {format(selectedDate, "yyyy년 MM월 dd일 (EEE)", { locale: ko })}
            </div>
            <input
              type="date"
              value={dateString}
              onChange={handleDateChange}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {attendances.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {format(selectedDate, "yyyy년 MM월 dd일", { locale: ko })}에
              생성된 출석부가 없습니다.
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(attendancesByMinistry).map(
                ([ministryName, roundGroups]) => {
                  // 모든 round의 모든 출석부를 합쳐서 계산
                  const allAttendances = Object.values(roundGroups).flatMap(
                    (roundGroup) => {
                      if (Array.isArray(roundGroup)) {
                        return roundGroup;
                      }
                      return Object.values(roundGroup).flatMap((subGroup) => {
                        if (Array.isArray(subGroup)) {
                          return subGroup;
                        }
                        return Object.values(subGroup).flat();
                      });
                    }
                  );
                  // ministryId를 안전하게 가져오기
                  const ministryId = allAttendances.find(
                    (a) => a?.ministry_id
                  )?.ministry_id;

                  return (
                    <div
                      key={ministryName}
                      className="border rounded-lg p-4 bg-card"
                    >
                      {/* 소속 헤더에 출석확정 버튼 추가 */}
                      <div className="flex items-center justify-between mb-4 pb-3 border-b">
                        <h2 className="text-xl sm:text-2xl font-bold">
                          {ministryName}
                        </h2>
                        <button
                          onClick={() =>
                            handleConfirmAttendance(ministryName, ministryId)
                          }
                          disabled={
                            confirmingAttendance === ministryName || !ministryId
                          }
                          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                        >
                          {confirmingAttendance === ministryName
                            ? "처리 중..."
                            : "출석확정"}
                        </button>
                      </div>
                      {/* Round별로 섹션 분리 */}
                      {Object.entries(roundGroups).map(([round, groups]) => {
                        // 해당 round의 모든 출석부 (이중 그룹화 구조 고려)
                        const roundAttendances = Object.values(groups).flatMap(
                          (groupData) => {
                            // 성가대인 경우: groupData는 배열
                            // 다른 부서인 경우: groupData는 객체 { "1반": [...], "2반": [...] }
                            const isChoir =
                              ministryName === "시온성가대" ||
                              ministryName === "예루살렘성가대";
                            if (isChoir || Array.isArray(groupData)) {
                              return groupData;
                            } else {
                              // 학년별 그룹 내의 모든 반의 출석부를 합침
                              return Object.values(groupData).flat();
                            }
                          }
                        );

                        return (
                          <div key={round} className="mb-6 last:mb-0">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg sm:text-xl font-semibold">
                                  {ministryName} - Round {round}
                                </h3>
                                <button
                                  onClick={() =>
                                    handleDeleteMinistryAttendance(
                                      ministryName,
                                      ministryId,
                                      round
                                    )
                                  }
                                  disabled={
                                    deletingMinistry ===
                                    `${ministryName}-${round}`
                                  }
                                  className="px-3 py-1 text-sm bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  {deletingMinistry ===
                                  `${ministryName}-${round}`
                                    ? "삭제 중..."
                                    : "삭제"}
                                </button>
                                <button
                                  onClick={() =>
                                    handleUpdateAttendance(
                                      roundAttendances,
                                      "출석"
                                    )
                                  }
                                  disabled={updating || selectedIds.size === 0}
                                  className="px-4 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  {updating ? "업중..." : "출석"}
                                </button>
                                <button
                                  onClick={() =>
                                    handleUpdateAttendance(
                                      roundAttendances,
                                      "결석"
                                    )
                                  }
                                  disabled={updating || selectedIds.size === 0}
                                  className="px-4 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  {updating ? "업중..." : "결석"}
                                </button>
                                <button
                                  onClick={() =>
                                    handleUpdateAttendance(
                                      roundAttendances,
                                      "지각"
                                    )
                                  }
                                  disabled={updating || selectedIds.size === 0}
                                  className="px-4 py-1 text-sm bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  {updating ? "업중..." : "지각"}
                                </button>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                총 {roundAttendances.length}명 / 선택{" "}
                                {
                                  Array.from(selectedIds).filter((id) =>
                                    roundAttendances.some((a) => a.id === id)
                                  ).length
                                }
                                명
                              </div>
                            </div>

                            {/* 파트별/학년별로 테이블 표시 */}
                            <div className="space-y-4">
                              {Object.entries(groups).map(
                                ([groupName, groupData]) => {
                                  // 성가대인 경우: groupData는 배열
                                  // 다른 부서인 경우: groupData는 객체 { "1반": [...], "2반": [...] }
                                  const isChoir =
                                    ministryName === "시온성가대" ||
                                    ministryName === "예루살렘성가대";

                                  if (isChoir || Array.isArray(groupData)) {
                                    // 성가대: 파트별로 직접 표시
                                    const groupAttendances = groupData;
                                    return (
                                      <div
                                        key={groupName}
                                        className="border rounded-lg p-3 bg-muted/30"
                                      >
                                        <h4 className="text-base font-semibold mb-2 pb-2 border-b">
                                          {groupName}
                                        </h4>
                                        <div className="overflow-x-auto">
                                          <table className="w-full border-collapse">
                                            <thead>
                                              <tr className="border-b">
                                                <th className="text-center p-2 text-sm font-semibold w-12">
                                                  <input
                                                    type="checkbox"
                                                    checked={groupAttendances.every(
                                                      (a) =>
                                                        selectedIds.has(a.id)
                                                    )}
                                                    onChange={() =>
                                                      handleSelectAll(
                                                        groupAttendances
                                                      )
                                                    }
                                                    className="cursor-pointer"
                                                  />
                                                </th>
                                                <th className="text-left p-2 text-sm font-semibold">
                                                  이름
                                                </th>
                                                <th className="text-left p-2 text-sm font-semibold">
                                                  전화번호
                                                </th>
                                                <th className="text-left p-2 text-sm font-semibold">
                                                  상태
                                                </th>
                                                <th className="text-left p-2 text-sm font-semibold">
                                                  메모
                                                </th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {groupAttendances.map(
                                                (attendance) => (
                                                  <tr
                                                    key={attendance.id}
                                                    className="border-b hover:bg-muted/50"
                                                  >
                                                    <td className="p-2 text-center">
                                                      <input
                                                        type="checkbox"
                                                        checked={selectedIds.has(
                                                          attendance.id
                                                        )}
                                                        onChange={() =>
                                                          handleToggleCheck(
                                                            attendance.id
                                                          )
                                                        }
                                                        className="cursor-pointer"
                                                      />
                                                    </td>
                                                    <td className="p-2">
                                                      {attendance.memberName}
                                                    </td>
                                                    <td className="p-2 text-sm text-muted-foreground">
                                                      {attendance.memberPhone ||
                                                        "-"}
                                                    </td>
                                                    <td className="p-2">
                                                      <span
                                                        className={`px-2 py-1 rounded text-xs font-medium ${
                                                          attendance.status ===
                                                          "출석"
                                                            ? "bg-green-100 text-green-800"
                                                            : attendance.status ===
                                                              "결석"
                                                            ? "bg-red-100 text-red-800"
                                                            : attendance.status ===
                                                              "지각"
                                                            ? "bg-yellow-100 text-yellow-800"
                                                            : "bg-gray-100 text-gray-800"
                                                        }`}
                                                      >
                                                        {attendance.status ||
                                                          "미입력"}
                                                      </span>
                                                    </td>
                                                    <td className="p-2">
                                                      <input
                                                        type="text"
                                                        value={
                                                          memos[
                                                            attendance.id
                                                          ] || ""
                                                        }
                                                        onChange={(e) =>
                                                          handleMemoChange(
                                                            attendance.id,
                                                            e.target.value
                                                          )
                                                        }
                                                        placeholder="메모 입력"
                                                        className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                                                      />
                                                    </td>
                                                  </tr>
                                                )
                                              )}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    );
                                  } else {
                                    // 다른 부서: 학년별로 그룹화하고, 각 학년 내에서 반별로 표시
                                    return (
                                      <div
                                        key={groupName}
                                        className="border rounded-lg p-4 bg-muted/30"
                                      >
                                        <h4 className="text-lg font-semibold mb-3 pb-2 border-b">
                                          {groupName}
                                        </h4>
                                        <div className="space-y-3">
                                          {Object.entries(groupData).map(
                                            ([className, classAttendances]) => (
                                              <div
                                                key={className}
                                                className="border rounded-lg p-3 bg-background"
                                              >
                                                <h5 className="text-base font-medium mb-2 pb-1 border-b">
                                                  {className}
                                                </h5>
                                                <div className="overflow-x-auto">
                                                  <table className="w-full border-collapse">
                                                    <thead>
                                                      <tr className="border-b">
                                                        <th className="text-center p-2 text-sm font-semibold w-12">
                                                          <input
                                                            type="checkbox"
                                                            checked={classAttendances.every(
                                                              (a) =>
                                                                selectedIds.has(
                                                                  a.id
                                                                )
                                                            )}
                                                            onChange={() =>
                                                              handleSelectAll(
                                                                classAttendances
                                                              )
                                                            }
                                                            className="cursor-pointer"
                                                          />
                                                        </th>
                                                        <th className="text-left p-2 text-sm font-semibold">
                                                          이름
                                                        </th>
                                                        <th className="text-left p-2 text-sm font-semibold">
                                                          전화번호
                                                        </th>
                                                        <th className="text-left p-2 text-sm font-semibold">
                                                          상태
                                                        </th>
                                                        <th className="text-left p-2 text-sm font-semibold">
                                                          메모
                                                        </th>
                                                      </tr>
                                                    </thead>
                                                    <tbody>
                                                      {classAttendances.map(
                                                        (attendance) => (
                                                          <tr
                                                            key={attendance.id}
                                                            className="border-b hover:bg-muted/50"
                                                          >
                                                            <td className="p-2 text-center">
                                                              <input
                                                                type="checkbox"
                                                                checked={selectedIds.has(
                                                                  attendance.id
                                                                )}
                                                                onChange={() =>
                                                                  handleToggleCheck(
                                                                    attendance.id
                                                                  )
                                                                }
                                                                className="cursor-pointer"
                                                              />
                                                            </td>
                                                            <td className="p-2">
                                                              {
                                                                attendance.memberName
                                                              }
                                                            </td>
                                                            <td className="p-2 text-sm text-muted-foreground">
                                                              {attendance.memberPhone ||
                                                                "-"}
                                                            </td>
                                                            <td className="p-2">
                                                              <span
                                                                className={`px-2 py-1 rounded text-xs font-medium ${
                                                                  attendance.status ===
                                                                  "출석"
                                                                    ? "bg-green-100 text-green-800"
                                                                    : attendance.status ===
                                                                      "결석"
                                                                    ? "bg-red-100 text-red-800"
                                                                    : attendance.status ===
                                                                      "지각"
                                                                    ? "bg-yellow-100 text-yellow-800"
                                                                    : "bg-gray-100 text-gray-800"
                                                                }`}
                                                              >
                                                                {attendance.status ||
                                                                  "미입력"}
                                                              </span>
                                                            </td>
                                                            <td className="p-2">
                                                              <input
                                                                type="text"
                                                                value={
                                                                  memos[
                                                                    attendance
                                                                      .id
                                                                  ] || ""
                                                                }
                                                                onChange={(e) =>
                                                                  handleMemoChange(
                                                                    attendance.id,
                                                                    e.target
                                                                      .value
                                                                  )
                                                                }
                                                                placeholder="메모 입력"
                                                                className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                                                              />
                                                            </td>
                                                          </tr>
                                                        )
                                                      )}
                                                    </tbody>
                                                  </table>
                                                </div>
                                              </div>
                                            )
                                          )}
                                        </div>
                                      </div>
                                    );
                                  }
                                }
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                }
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AttendList;
