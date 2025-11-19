import React from "react";
import { Link } from "react-router-dom";
import { useZion } from "../context/ZionContext";

const PARTS = ["SOPRANO", "ALTO", "TENOR", "BASS"];

function ZionList() {
  const { members, loading, error } = useZion();

  // 파트별로 멤버 필터링 (is_active가 true인 멤버만)
  const getMembersByPart = (part) => {
    return members.filter(
      (member) => member.part === part && member.is_active !== false
    );
  };

  if (loading) {
    return <div className="p-4">로딩 중...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">에러 발생: {error}</div>;
  }

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-6">파트별 멤버 리스트</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                  to={`/zion/write?part=${part}`}
                  className="ml-2 text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
                >
                  인원추가
                </Link>
              </h3>
              <ul className="space-y-2">
                {partMembers.length > 0 ? (
                  partMembers.map((member) => (
                    <li
                      key={member.id}
                      className="p-2 bg-muted rounded hover:bg-accent transition-colors flex justify-between items-center"
                    >
                      <div className="font-medium">
                        {member.name || "이름 없음"}
                      </div>
                      <Link
                        to={`/zion/modify/${member.id}`}
                        className="ml-2 text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
                      >
                        수정
                      </Link>
                    </li>
                  ))
                ) : (
                  <li className="text-muted-foreground text-sm">
                    멤버가 없습니다
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ZionList;
