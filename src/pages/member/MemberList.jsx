import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import supabase from "../../utils/supabase";
import { useMember } from "../context/MemberContext";

function MemberList() {
  const { isAdmin, loading: authLoading, user } = useMember();
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [adminMembers, setAdminMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedMinistryId, setSelectedMinistryId] = useState("");
  const [ministries, setMinistries] = useState([]);
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [addAdminError, setAddAdminError] = useState(null);
  const [deletingAdminId, setDeletingAdminId] = useState(null);

  // auth_user_id가 있는 회원 목록 가져오기 (auth.users에서 이메일 정보 가져오기)
  const fetchMembersWithAuthUserId = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. members 테이블에서 auth_user_id가 있는 회원만 가져오기
      const { data: membersData, error: membersError } = await supabase
        .from("members")
        .select("id, name, phone, auth_user_id")
        .not("auth_user_id", "is", null);

      if (membersError) {
        throw membersError;
      }

      // 2. auth.users에서 이메일 정보 가져오기
      let authUsersMap = new Map();

      try {
        // RPC 함수를 통해 auth.users 조회 (서버에서 생성 필요)
        const { data: authUsers, error: rpcError } = await supabase.rpc(
          "get_auth_users_emails"
        );

        if (!rpcError && authUsers) {
          authUsers.forEach((user) => {
            if (user.id) {
              authUsersMap.set(user.id, user.email);
            }
          });
        }
      } catch (rpcErr) {
        console.log("RPC 함수를 사용할 수 없습니다. 직접 조회를 시도합니다.");
      }

      // 3. members와 auth.users 매칭하여 이메일 추가
      const membersWithEmail = (membersData || []).map((member) => {
        let email = null;

        // auth_user_id가 있으면 매칭
        if (member.auth_user_id && authUsersMap.has(member.auth_user_id)) {
          email = authUsersMap.get(member.auth_user_id);
        }

        return {
          ...member,
          email,
        };
      });

      setMembers(membersWithEmail);
    } catch (err) {
      console.error("회원 목록 가져오기 오류:", err);
      setError(err.message || "회원 목록을 가져오는 중 오류가 발생했습니다.");
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  // member_role 테이블에서 모든 관리자 목록 가져오기 (ministry_id로 그룹화)
  const fetchAdminMembers = async () => {
    try {
      console.log("관리자 목록 조회 시작...");

      // member_role 테이블에는 role 컬럼이 없으므로 모든 레코드를 가져옴
      const { data, error: fetchError } = await supabase
        .from("member_role")
        .select(
          `
          *,
          member_id,
          ministry_id,
          member:members(id, name, phone, auth_user_id),
          ministry:ministry(id, name)
        `
        );

      if (fetchError) {
        console.error("member_role 조회 오류:", fetchError);
        throw fetchError;
      }

      console.log("member_role 조회 결과:", data);

      // 데이터가 없으면 빈 배열 설정
      if (!data || data.length === 0) {
        console.log("member_role에 관리자 데이터가 없습니다. fallback 시도...");
        // member_role 테이블이 없거나 데이터가 없을 경우 members 테이블에서 직접 조회
        try {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("members")
            .select("id, name, phone, auth_user_id, member_role")
            .eq("member_role", "관리");

          if (fallbackError) {
            console.error("members 테이블 fallback 오류:", fallbackError);
            setAdminMembers([]);
            return;
          }

          console.log("members 테이블 fallback 결과:", fallbackData);

          if (fallbackData && fallbackData.length > 0) {
            // auth.users에서 이메일 가져오기
            let authUsersMap = new Map();
            const memberIds = fallbackData
              .map((m) => m.auth_user_id)
              .filter(Boolean);

            if (memberIds.length > 0) {
              try {
                const { data: authUsers, error: rpcError } = await supabase.rpc(
                  "get_auth_users_emails"
                );

                if (!rpcError && authUsers) {
                  authUsers.forEach((user) => {
                    if (user.id) {
                      authUsersMap.set(user.id, user.email);
                    }
                  });
                }
              } catch (rpcErr) {
                console.log("RPC 함수를 사용할 수 없습니다.");
              }
            }

            const membersWithEmail = fallbackData.map((member) => ({
              ...member,
              email:
                member.auth_user_id && authUsersMap.has(member.auth_user_id)
                  ? authUsersMap.get(member.auth_user_id)
                  : null,
              role: member.member_role,
              ministryName: "-",
            }));

            setAdminMembers(membersWithEmail);
          } else {
            setAdminMembers([]);
          }
        } catch (fallbackErr) {
          console.error("Fallback 조회 오류:", fallbackErr);
          setAdminMembers([]);
        }
        return;
      }

      // auth.users에서 이메일 정보 가져오기
      let authUsersMap = new Map();
      const memberIds = (data || [])
        .map((role) => role.member?.auth_user_id)
        .filter(Boolean);

      if (memberIds.length > 0) {
        try {
          const { data: authUsers, error: rpcError } = await supabase.rpc(
            "get_auth_users_emails"
          );

          if (!rpcError && authUsers) {
            authUsers.forEach((user) => {
              if (user.id) {
                authUsersMap.set(user.id, user.email);
              }
            });
          }
        } catch (rpcErr) {
          console.log("RPC 함수를 사용할 수 없습니다.");
        }
      }

      // 데이터 구조 변환 (member_id와 ministry_id 포함)
      const adminMembersWithInfo = (data || [])
        .filter((role) => role.member) // member가 있는 것만 필터링
        .map((role) => {
          const member = role.member || {};
          const email =
            member.auth_user_id && authUsersMap.has(member.auth_user_id)
              ? authUsersMap.get(member.auth_user_id)
              : null;

          return {
            ...member,
            email,
            role: "관리", // member_role 테이블에 있으면 관리자
            member_id: role.member_id,
            ministry_id: role.ministry_id,
            ministry: role.ministry,
            ministryName: role.ministry?.name || "-",
          };
        });

      console.log("최종 관리자 목록:", adminMembersWithInfo);
      setAdminMembers(adminMembersWithInfo);
    } catch (err) {
      console.error("관리자 목록 가져오기 오류:", err);
      setAdminMembers([]);
    }
  };

  // ministry 목록 가져오기
  useEffect(() => {
    const fetchMinistries = async () => {
      try {
        const { data, error } = await supabase
          .from("ministry")
          .select("id, name")
          .order("name");

        if (error) {
          console.error("소속 목록 가져오기 오류:", error);
          return;
        }

        if (data) {
          setMinistries(data);
        }
      } catch (err) {
        console.error("소속 목록 가져오기 중 오류:", err);
      }
    };

    fetchMinistries();
  }, []);

  useEffect(() => {
    fetchMembersWithAuthUserId();
    fetchAdminMembers();
  }, []);

  // 관리자 추가 함수
  const handleAddAdmin = async () => {
    if (!selectedMemberId || !selectedMinistryId) {
      setAddAdminError("회원과 소속을 모두 선택해주세요.");
      return;
    }

    setAddingAdmin(true);
    setAddAdminError(null);

    try {
      const memberId = parseInt(selectedMemberId);
      const ministryId = parseInt(selectedMinistryId);

      if (isNaN(memberId) || isNaN(ministryId)) {
        throw new Error("회원 ID 또는 소속 ID가 유효하지 않습니다.");
      }

      console.log("관리자 추가 시도:", { memberId, ministryId });

      // 중복 체크: 같은 member_id와 ministry_id가 이미 있는지 확인
      const { data: existingRole, error: checkError } = await supabase
        .from("member_role")
        .select("id")
        .eq("member_id", memberId)
        .eq("ministry_id", ministryId)
        .maybeSingle();

      if (checkError) {
        console.error("중복 체크 오류:", checkError);
        throw checkError;
      }

      if (existingRole) {
        setAddAdminError("이미 해당 소속의 관리자로 등록되어 있습니다.");
        setAddingAdmin(false);
        return;
      }

      // member_role 테이블에 추가
      const { data: insertedData, error: insertError } = await supabase
        .from("member_role")
        .insert([
          {
            member_id: memberId,
            ministry_id: ministryId,
          },
        ])
        .select();

      if (insertError) {
        console.error("관리자 추가 insert 오류:", insertError);
        throw insertError;
      }

      console.log("관리자 추가 성공:", insertedData);

      // 성공 시 모달 닫고 목록 새로고침
      setShowAddAdminModal(false);
      setSelectedMemberId("");
      setSelectedMinistryId("");
      setAddAdminError(null);
      await fetchAdminMembers();
    } catch (err) {
      console.error("관리자 추가 오류:", err);
      const errorMessage =
        err.message || err.details || "관리자 추가 중 오류가 발생했습니다.";
      setAddAdminError(errorMessage);
    } finally {
      setAddingAdmin(false);
    }
  };

  // 관리자 삭제 함수
  const handleDeleteAdmin = async (memberId, ministryId) => {
    if (!confirm("정말 이 관리자를 삭제하시겠습니까?")) {
      return;
    }

    const deleteKey = `${memberId}-${ministryId}`;
    setDeletingAdminId(deleteKey);

    try {
      const { error: deleteError } = await supabase
        .from("member_role")
        .delete()
        .eq("member_id", memberId)
        .eq("ministry_id", ministryId);

      if (deleteError) {
        throw deleteError;
      }

      // 목록 새로고침
      await fetchAdminMembers();
    } catch (err) {
      console.error("관리자 삭제 오류:", err);
      alert(err.message || "관리자 삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingAdminId(null);
    }
  };

  // 검색 필터링
  const filteredMembers = members.filter((member) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const name = (member.name || "").toLowerCase();
    const phone = (member.phone || "").toLowerCase();
    const email = (member.email || "").toLowerCase();
    return name.includes(term) || phone.includes(term) || email.includes(term);
  });

  const filteredAdminMembers = adminMembers.filter((member) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const name = (member.name || "").toLowerCase();
    const phone = (member.phone || "").toLowerCase();
    const email = (member.email || "").toLowerCase();
    const ministryName = (member.ministryName || "").toLowerCase();
    return (
      name.includes(term) ||
      phone.includes(term) ||
      email.includes(term) ||
      ministryName.includes(term)
    );
  });

  // 권한 체크
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        // 로그인하지 않은 경우 로그인 페이지로 이동
        navigate("/member/login");
        return;
      }
      if (!isAdmin) {
        // admin 권한이 없는 경우 접근 차단
        navigate("/");
        return;
      }
    }
  }, [user, isAdmin, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="p-10 text-center">
        <div>로딩 중...</div>
      </div>
    );
  }

  // 권한이 없으면 아무것도 표시하지 않음 (리다이렉트 중)
  if (!user || !isAdmin) {
    return null;
  }

  if (error) {
    return (
      <div className="p-10">
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-3xl font-bold mb-4">회원 목록</h2>

        {/* 검색 바 */}
        <div className="mb-6">
          <Input
            type="text"
            placeholder="이름, 전화번호, 이메일로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md"
          />
        </div>
      </div>

      {/* auth_user_id가 있는 회원 목록 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>
            인증 ID가 있는 회원 ({filteredMembers.length}명)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredMembers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              인증 ID가 있는 회원이 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-muted">
                    <th className="text-left p-3 font-semibold">이름</th>
                    <th className="text-left p-3 font-semibold">전화번호</th>
                    <th className="text-left p-3 font-semibold">인증 ID</th>
                    <th className="text-left p-3 font-semibold">이메일</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">{member.name || "-"}</td>
                      <td className="p-3">{member.phone || "-"}</td>
                      <td className="p-3">{member.auth_user_id || "-"}</td>
                      <td className="p-3">{member.email || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 관리자 목록 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>관리자 목록 ({filteredAdminMembers.length}명)</CardTitle>
            <Button onClick={() => setShowAddAdminModal(true)} className="ml-4">
              관리자 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAdminMembers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              관리자 회원이 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-muted">
                    <th className="text-left p-3 font-semibold">이름</th>
                    <th className="text-left p-3 font-semibold">전화번호</th>
                    <th className="text-left p-3 font-semibold">이메일</th>
                    <th className="text-left p-3 font-semibold">역할</th>
                    <th className="text-left p-3 font-semibold">소속</th>
                    <th className="text-left p-3 font-semibold">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdminMembers.map((member) => {
                    const deleteKey = `${member.member_id}-${member.ministry_id}`;
                    const isDeleting = deletingAdminId === deleteKey;

                    return (
                      <tr
                        key={member.id}
                        className="border-b hover:bg-muted/50"
                      >
                        <td className="p-3">{member.name || "-"}</td>
                        <td className="p-3">{member.phone || "-"}</td>
                        <td className="p-3">{member.email || "-"}</td>
                        <td className="p-3">
                          {member.role || member.member_role || "-"}
                        </td>
                        <td className="p-3">{member.ministryName || "-"}</td>
                        <td className="p-3">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              handleDeleteAdmin(
                                member.member_id,
                                member.ministry_id
                              )
                            }
                            disabled={isDeleting}
                          >
                            {isDeleting ? "삭제 중..." : "삭제"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 관리자 추가 모달 */}
      {showAddAdminModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>관리자 추가</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {addAdminError && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                  {addAdminError}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="member-select" className="text-sm font-medium">
                  회원 선택
                </label>
                <select
                  id="member-select"
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={addingAdmin}
                >
                  <option value="">회원을 선택하세요</option>
                  {filteredMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} ({member.email || member.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="ministry-select"
                  className="text-sm font-medium"
                >
                  소속 선택
                </label>
                <select
                  id="ministry-select"
                  value={selectedMinistryId}
                  onChange={(e) => setSelectedMinistryId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={addingAdmin}
                >
                  <option value="">소속을 선택하세요</option>
                  {ministries.map((ministry) => (
                    <option key={ministry.id} value={ministry.id}>
                      {ministry.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddAdminModal(false);
                    setSelectedMemberId("");
                    setSelectedMinistryId("");
                    setAddAdminError(null);
                  }}
                  disabled={addingAdmin}
                >
                  취소
                </Button>
                <Button onClick={handleAddAdmin} disabled={addingAdmin}>
                  {addingAdmin ? "추가 중..." : "추가"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default MemberList;
