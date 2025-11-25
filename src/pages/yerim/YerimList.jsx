import React from "react";
import { Link } from "react-router-dom";
import { useYerim } from "../context/YerimContext";

const PARTS = ["SOPRANO", "ALTO", "TENOR", "BASS"];

function YerimList() {
  const { members, loading, error, ministryCode } = useYerim();

  // 중고등부인지 확인
  const isStudentMinistry = ministryCode === "중고등부";

  // 파트별로 멤버 필터링 (is_active가 true인 멤버만)
  // 성가대의 경우 membership.part 사용, 중고등부는 members.part 사용
  const getMembersByPart = (part) => {
    if (isStudentMinistry) {
      // 중고등부는 members 테이블의 part 사용
      return members.filter(
        (member) => member.part === part && member.is_active !== false
      );
    } else {
      // 성가대는 membership 테이블의 part 사용
      return members.filter(
        (member) => member.membershipPart === part && member.is_active !== false
      );
    }
  };

  // 활성화된 멤버만 가져오기
  const getActiveMembers = () => {
    return members.filter((member) => member.is_active !== false);
  };

  if (loading) {
    return <div className="p-4">로딩 중...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">에러 발생: {error}</div>;
  }

  // 중고등부일 경우 학생별로 표시
  if (isStudentMinistry) {
    const activeMembers = getActiveMembers();
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">
            {ministryCode} - 학생 리스트
          </h2>
          <Link
            to={`/yerim/write?code=${ministryCode}`}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            학생 추가
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {activeMembers.length > 0 ? (
            activeMembers.map((member) => (
              <div
                key={member.id}
                className="border rounded-lg p-4 bg-card hover:bg-accent transition-colors flex flex-col items-center text-center"
              >
                <div className="mb-2">
                  {member.photo ? (
                    <img
                      src={member.photo}
                      alt={member.name}
                      className="w-[80px] h-[80px] rounded-3xl object-cover mx-auto"
                    />
                  ) : (
                    <div className="w-[80px] h-[80px] rounded-3xl bg-gray-300 flex items-center justify-center text-4xl font-semibold text-gray-700">
                      {member.name ? member.name[0] : "?"}
                    </div>
                  )}
                </div>
                <div className="font-medium text-base mb-1">
                  {member.name || "이름 없음"}
                </div>
                {(member.membershipPart || member.part) && (
                  <div className="text-xs text-muted-foreground mb-1">
                    {member.membershipPart || member.part}
                  </div>
                )}
                {member.position && (
                  <div className="text-xs text-muted-foreground mb-1">
                    {member.position}
                  </div>
                )}
                <Link
                  to={`/yerim/modify/${member.id}?code=${ministryCode}`}
                  className="text-xs text-primary hover:text-primary/80 hover:underline transition-colors"
                >
                  수정
                </Link>
              </div>
            ))
          ) : (
            <div className="col-span-full text-muted-foreground text-sm text-center py-8">
              학생이 없습니다
            </div>
          )}
        </div>
      </div>
    );
  }

  // 시온성가대, 예루살렘성가대 등의 경우 파트별로 표시
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">
          {ministryCode} - 파트별 멤버 리스트
        </h2>
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
                        to={`/yerim/modify/${member.id}?code=${ministryCode}`}
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
