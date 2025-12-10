import { createContext, useContext, useState, useEffect } from "react";
import supabase from "../../utils/supabase";

const MemberContext = createContext();

export const useMember = () => {
  return useContext(MemberContext);
};

export const MemberProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [memberData, setMemberData] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // 로그인 상태 확인 및 권한 체크
  useEffect(() => {
    // 현재 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        checkAdminRole(session.user.id);
      } else {
        setUser(null);
        setMemberData(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    // 인증 상태 변경 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        await checkAdminRole(session.user.id);
      } else {
        setUser(null);
        setMemberData(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // admin 권한 체크
  const checkAdminRole = async (authUserId) => {
    try {
      // members 테이블에서 auth_user_id로 member 찾기
      const { data: member, error: memberError } = await supabase
        .from("members")
        .select("id, name, phone, auth_user_id")
        .eq("auth_user_id", authUserId)
        .maybeSingle();

      if (memberError) {
        console.error("회원 조회 오류:", memberError);
        setLoading(false);
        return;
      }

      if (!member) {
        setMemberData(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setMemberData(member);

      // member_role 테이블에서 role이 "admin"인지 확인
      const { data: memberRole, error: roleError } = await supabase
        .from("member_role")
        .select("role")
        .eq("member_id", member.id)
        .eq("role", "admin")
        .maybeSingle();

      if (roleError) {
        console.error("권한 조회 오류:", roleError);
        setIsAdmin(false);
      } else {
        setIsAdmin(!!memberRole);
      }
    } catch (err) {
      console.error("권한 체크 오류:", err);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  // 로그인 함수
  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        setUser(data.user);
        await checkAdminRole(data.user.id);
        return { success: true, user: data.user };
      }

      return { success: false, error: "로그인에 실패했습니다." };
    } catch (err) {
      return { success: false, error: err.message || "로그인에 실패했습니다." };
    }
  };

  // 로그아웃 함수
  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      setUser(null);
      setMemberData(null);
      setIsAdmin(false);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const value = {
    user,
    memberData,
    isAdmin,
    loading,
    login,
    logout,
    checkAdminRole,
  };

  return (
    <MemberContext.Provider value={value}>{children}</MemberContext.Provider>
  );
};
