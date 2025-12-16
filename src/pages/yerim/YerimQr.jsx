import React, { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import supabase from "../../utils/supabase";

function YerimQr() {
  const [scannedData, setScannedData] = useState(null);
  const [memberInfo, setMemberInfo] = useState(null);
  const [points, setPoints] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(true);

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
        .select("id, name, phone, birth")
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
      setPoints(pointData?.balace || 0);
    } catch (err) {
      console.error("QR 코드 처리 오류:", err);
      setError(err.message || "QR 코드를 처리하는 중 오류가 발생했습니다.");
      setMemberInfo(null);
      setPoints(null);
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
    setPoints(null);
    setError(null);
    setIsScanning(true);
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
      <h1 className="text-2xl font-bold mb-6">QR 코드 포인트 확인</h1>

      {/* QR 스캐너 */}
      {isScanning && (
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <h2 className="text-lg font-semibold mb-2">QR 코드 스캔</h2>
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
          </div>
        </div>
      )}

      {/* 로딩 상태 */}
      {loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-blue-800">회원 정보를 조회하는 중...</p>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800 font-semibold mb-2">오류</p>
          <p className="text-red-700">{error}</p>
          <button
            onClick={handleRescan}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            다시 스캔하기
          </button>
        </div>
      )}

      {/* 회원 정보 및 포인트 표시 */}
      {memberInfo && !loading && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">회원 정보</h2>
            <button
              onClick={handleRescan}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              다시 스캔하기
            </button>
          </div>

          <div className="space-y-4">
            {/* 회원 기본 정보 */}
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

            {/* 포인트 정보 */}
            <div className="border-t pt-4 mt-4">
              <div className="bg-primary/10 rounded-lg p-4">
                <label className="text-sm font-medium text-muted-foreground block mb-2">
                  현재 포인트
                </label>
                <p className="text-3xl font-bold text-primary">
                  {points !== null ? `${points}점` : "0점"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 스캔 안내 */}
      {!isScanning && !memberInfo && !loading && !error && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-muted-foreground mb-4">
            QR 코드를 스캔하려면 "다시 스캔하기" 버튼을 클릭하세요.
          </p>
          <button
            onClick={handleRescan}
            className="px-6 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
          >
            다시 스캔하기
          </button>
        </div>
      )}
    </div>
  );
}

export default YerimQr;
