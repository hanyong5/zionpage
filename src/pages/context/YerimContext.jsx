import { createContext, useContext, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import supabase from "../../utils/supabase";

const YerimContext = createContext();

export const useYerim = () => {
  return useContext(YerimContext);
};

export const YerimProvider = ({ children }) => {
  const [searchParams] = useSearchParams();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ministryCode, setMinistryCode] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      setMinistryCode(code);
    }
  }, [searchParams]);

  const fetchMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      // 먼저 ministry 정보 가져오기
      if (ministryCode) {
        const { data: ministryData, error: ministryError } = await supabase
          .from("ministry")
          .select("id")
          .eq("name", ministryCode)
          .single();

        if (ministryError) {
          throw ministryError;
        }

        if (!ministryData) {
          setError(`Ministry "${ministryCode}"를 찾을 수 없습니다.`);
          setMembers([]);
          setLoading(false);
          return;
        }

        // membership 테이블에서 해당 ministry에 속한 member_id, part, is_active 가져오기
        const { data: membershipData, error: membershipError } = await supabase
          .from("membership")
          .select("member_id, part, is_active")
          .eq("ministry_id", ministryData.id);

        if (membershipError) {
          throw membershipError;
        }

        if (!membershipData || membershipData.length === 0) {
          setMembers([]);
          setLoading(false);
          return;
        }

        // member_id 배열 추출
        const memberIds = membershipData.map((m) => m.member_id);

        // members 테이블에서 해당 member들 가져오기
        const { data, error } = await supabase
          .from("members")
          .select("*")
          .in("id", memberIds);

        if (error) {
          throw error;
        }

        // members 데이터에 membership의 part와 is_active 정보 병합
        const membersWithPart = (data || []).map((member) => {
          const membership = membershipData.find(
            (m) => m.member_id === member.id
          );
          return {
            ...member,
            membershipPart: membership?.part || null, // membership의 part
            is_active: membership?.is_active !== false, // membership의 is_active
          };
        });

        setMembers(membersWithPart);
      } else {
        // code가 없으면 모든 멤버 가져오기
        const { data, error } = await supabase.from("members").select("*");

        if (error) {
          throw error;
        }

        setMembers(data || []);
      }
    } catch (err) {
      setError(err.message);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ministryCode) {
      fetchMembers();
    }
  }, [ministryCode]);

  const addMember = async (memberData) => {
    try {
      // part와 is_active는 membership 테이블에만 저장
      const { part, is_active, ...memberFields } = memberData;

      // 1. members 테이블에 멤버 추가 (part 제외)
      const { data: newMember, error: memberError } = await supabase
        .from("members")
        .insert([memberFields])
        .select()
        .single();

      if (memberError) {
        throw memberError;
      }

      // 2. ministry 정보 가져오기
      const { data: ministryData, error: ministryError } = await supabase
        .from("ministry")
        .select("id")
        .eq("name", ministryCode)
        .single();

      if (ministryError) {
        throw ministryError;
      }

      // 3. membership 테이블에 관계 추가 (part 포함)
      const { error: membershipError } = await supabase
        .from("membership")
        .insert([
          {
            member_id: newMember.id,
            ministry_id: ministryData.id,
            part: part,
            is_active: true,
          },
        ]);

      if (membershipError) {
        throw membershipError;
      }

      // 멤버 리스트 새로고침
      await fetchMembers();
      return { success: true, data: newMember };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateMember = async (id, memberData) => {
    try {
      // 1. members 테이블 업데이트
      const { data: updatedMember, error: memberError } = await supabase
        .from("members")
        .update(memberData)
        .eq("id", id)
        .select()
        .single();

      if (memberError) {
        throw memberError;
      }

      // 2. ministry 정보 가져오기
      const { data: ministryData, error: ministryError } = await supabase
        .from("ministry")
        .select("id")
        .eq("name", ministryCode)
        .single();

      if (ministryError) {
        throw ministryError;
      }

      // 3. membership 테이블의 part와 is_active 업데이트
      const { error: membershipError } = await supabase
        .from("membership")
        .update({
          part: memberData.part,
          is_active: memberData.is_active
        })
        .eq("member_id", id)
        .eq("ministry_id", ministryData.id);

      if (membershipError) {
        throw membershipError;
      }

      // 멤버 리스트 새로고침
      await fetchMembers();
      return { success: true, data: updatedMember };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const getMemberById = (id) => {
    return members.find((member) => member.id === parseInt(id));
  };

  const value = {
    members,
    loading,
    error,
    ministryCode,
    addMember,
    updateMember,
    getMemberById,
    refreshMembers: fetchMembers,
  };

  return (
    <YerimContext.Provider value={value}>{children}</YerimContext.Provider>
  );
};
