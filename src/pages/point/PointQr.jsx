import React, { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import supabase from "../../utils/supabase";
import { source_subtype } from "./pointconst";

function PointQr() {
  const [scannedData, setScannedData] = useState(null);
  const [memberInfo, setMemberInfo] = useState(null);
  const [currentPoints, setCurrentPoints] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(true);
  const [showPointModal, setShowPointModal] = useState(false);
  const [pointAmount, setPointAmount] = useState("");
  const [pointSubtype, setPointSubtype] = useState("");
  const [pointMemo, setPointMemo] = useState("");
  const [processingPoints, setProcessingPoints] = useState(false);

  // QR 코드 스캔 핸들러
  const handleScan = async (detectedCodes) => {
    if (!detectedCodes || detectedCodes.length === 0) return;

    // 이미 처리 중이면 무시
    if (loading) return;

    // 첫 번째 감지된 코드 사용
    const firstCode = detectedCodes[0];
    if (!firstCode || !firstCode.rawValue) return;

    setLoading(true);
    setError(null);
    setIsScanning(false); // 스캔 중지

    try {
      // QR 코드 데이터 파싱 (JSON 형식)
      const qrData = JSON.parse(firstCode.rawValue);
      const { name, phone, birth } = qrData;

      if (!name || !phone || !birth) {
        throw new Error("QR 코드 데이터가 올바르지 않습니다.");
      }

      setScannedData(qrData);

      // 회원 정보 조회 (이름, 전화번호, 생년월일로 매칭)
      const { data: members, error: memberError } = await supabase
        .from("members")
        .select("id, name, phone, birth, photo")
        .eq("name", name)
        .eq("phone", phone)
        .eq("birth", birth)
        .maybeSingle();

      if (memberError) {
        throw new Error(`회원 조회 오류: ${memberError.message}`);
      }

      if (!members) {
        throw new Error("해당 정보와 일치하는 회원을 찾을 수 없습니다.");
      }

      setMemberInfo(members);

      // 포인트 정보 조회
      const { data: pointData, error: pointError } = await supabase
        .from("member_points")
        .select("id, balace")
        .eq("id", members.id)
        .maybeSingle();

      if (pointError && pointError.code !== "PGRST116") {
        // PGRST116은 "no rows returned" 오류이므로 무시
        throw new Error(`포인트 조회 오류: ${pointError.message}`);
      }

      // 포인트가 없으면 0으로 설정
      const points = pointData?.balace || 0;
      setCurrentPoints(points);

      // 회원 정보 확인 후 포인트 모달 자동 열기
      setShowPointModal(true);
    } catch (err) {
      console.error("QR 코드 처리 오류:", err);
      setError(err.message || "QR 코드를 처리하는 중 오류가 발생했습니다.");
      setMemberInfo(null);
      setCurrentPoints(null);
    } finally {
      setLoading(false);
    }
  };

  // 에러 핸들러
  const handleError = (err) => {
    console.error("QR 스캐너 오류:", err);
    setError("QR 코드 스캐너를 초기화하는 중 오류가 발생했습니다.");
  };

  // 다시 스캔하기
  const handleRescan = () => {
    setScannedData(null);
    setMemberInfo(null);
    setCurrentPoints(null);
    setError(null);
    setIsScanning(true);
    setShowPointModal(false);
    setPointAmount("");
    setPointSubtype("");
    setPointMemo("");
  };

  // 포인트 추가/차감 처리
  const handleProcessPoints = async (isAdd) => {
    if (!memberInfo) {
      alert("회원 정보가 없습니다.");
      return;
    }

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
        `${memberInfo.name}님에게 ${isAdd ? "추가" : "차감"} ${amount}점을 ${
          isAdd ? "지급" : "차감"
        }하시겠습니까?\n유형: ${pointSubtype}`
      )
    ) {
      return;
    }

    setProcessingPoints(true);
    setError(null);

    try {
      // 1. member_points에서 현재 balance 조회
      const { data: memberPoint, error: pointError } = await supabase
        .from("member_points")
        .select("id, balace")
        .eq("id", memberInfo.id)
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
          member_id: memberInfo.id,
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
          .eq("id", memberInfo.id);

        if (updatePointError) {
          throw updatePointError;
        }
      } else {
        const { error: insertPointError } = await supabase
          .from("member_points")
          .insert({
            id: memberInfo.id,
            balace: newBalance,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (insertPointError) {
          throw insertPointError;
        }
      }

      // 성공 메시지
      alert(
        `${memberInfo.name}님에게 포인트가 ${
          isAdd ? "추가" : "차감"
        }되었습니다.\n현재 포인트: ${newBalance}점`
      );

      // 포인트 정보 업데이트
      setCurrentPoints(newBalance);

      // 모달 초기화
      setPointAmount("");
      setPointSubtype("");
      setPointMemo("");
    } catch (err) {
      console.error("포인트 처리 오류:", err);
      setError(err.message || "포인트 처리 중 오류가 발생했습니다.");
      alert("포인트 처리 중 오류가 발생했습니다: " + err.message);
    } finally {
      setProcessingPoints(false);
    }
  };

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

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">QR 코드 포인트 관리</h1>

      {/* QR 스캐너 */}
      {isScanning && (
        <div className="mb-6">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>QR 코드 스캔</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                회원의 QR 코드를 카메라에 비춰주세요.
              </p>
              <div
                className="relative rounded-lg overflow-hidden border-2 border-gray-300"
                style={{ height: "400px" }}
              >
                <Scanner
                  onScan={handleScan}
                  onError={handleError}
                  constraints={{
                    facingMode: "environment", // 후면 카메라 사용
                  }}
                  components={{
                    finder: true, // 스캔 영역 표시
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 로딩 상태 */}
      {loading && (
        <Card className="bg-blue-50 border border-blue-200 mb-4">
          <CardContent className="p-4">
            <p className="text-blue-800">회원 정보를 조회하는 중...</p>
          </CardContent>
        </Card>
      )}

      {/* 에러 메시지 */}
      {error && (
        <Card className="bg-red-50 border border-red-200 mb-4">
          <CardContent className="p-4">
            <p className="text-red-800 font-semibold mb-2">오류</p>
            <p className="text-red-700 mb-3">{error}</p>
            <button
              onClick={handleRescan}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              다시 스캔하기
            </button>
          </CardContent>
        </Card>
      )}

      {/* 회원 정보 표시 */}
      {memberInfo && !loading && (
        <Card className="bg-white mb-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>회원 정보</CardTitle>
              <button
                onClick={handleRescan}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors text-sm"
              >
                다시 스캔하기
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 회원 기본 정보 */}
              <div className="flex items-center gap-4">
                {memberInfo.photo ? (
                  <img
                    src={memberInfo.photo}
                    alt={memberInfo.name}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-300 flex items-center justify-center text-2xl font-semibold text-gray-700">
                    {memberInfo.name?.[0] || "?"}
                  </div>
                )}
                <div className="flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        이름
                      </label>
                      <p className="text-lg font-semibold mt-1">
                        {memberInfo.name || "-"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        전화번호
                      </label>
                      <p className="text-lg font-semibold mt-1">
                        {memberInfo.phone || "-"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        생년월일
                      </label>
                      <p className="text-lg font-semibold mt-1">
                        {formatDate(memberInfo.birth)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 포인트 정보 */}
              <div className="border-t pt-4 mt-4">
                <div className="bg-primary/10 rounded-lg p-4">
                  <label className="text-sm font-medium text-muted-foreground block mb-2">
                    현재 포인트
                  </label>
                  <p className="text-3xl font-bold text-primary">
                    {currentPoints !== null ? `${currentPoints}점` : "0점"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 스캔 안내 */}
      {!isScanning && !memberInfo && !loading && !error && (
        <Card className="bg-gray-50 border border-gray-200">
          <CardContent className="p-4 text-center">
            <p className="text-muted-foreground mb-4">
              QR 코드를 스캔하려면 "다시 스캔하기" 버튼을 클릭하세요.
            </p>
            <button
              onClick={handleRescan}
              className="px-6 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              다시 스캔하기
            </button>
          </CardContent>
        </Card>
      )}

      {/* 포인트 추가/차감 모달 */}
      {showPointModal && memberInfo && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            if (!processingPoints) {
              setShowPointModal(false);
            }
          }}
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
                {memberInfo.name}님의 포인트를 추가하거나 차감합니다.
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
                disabled={processingPoints}
                className="w-full px-4 py-2 border rounded-lg font-medium hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

export default PointQr;
