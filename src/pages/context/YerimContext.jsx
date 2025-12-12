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
    setMinistryCode(code || "");
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

        // 현재 년도와 다음 년도만 가져오기
        const currentYear = new Date().getFullYear();
        const nextYear = currentYear + 1;

        // membership 테이블에서 해당 ministry에 속한 id, member_id, part, is_active, grade, year, position, leader, class 가져오기
        // 현재 년도와 다음 년도만 필터링
        const { data: membershipData, error: membershipError } = await supabase
          .from("membership")
          .select(
            "id, member_id, part, is_active, grade, year, position, leader, class"
          )
          .eq("ministry_id", ministryData.id)
          .in("year", [currentYear, nextYear])
          .order("year", { ascending: false });

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

        // ministry 정보 가져오기
        const { data: ministryInfo, error: ministryInfoError } = await supabase
          .from("ministry")
          .select("id, name")
          .eq("id", ministryData.id)
          .single();

        // members 데이터에 membership의 part, is_active, grade, year 정보 병합
        // 각 멤버의 모든 년도 membership 정보를 포함
        const membersWithPart = (data || []).map((member) => {
          const memberships = membershipData.filter(
            (m) => m.member_id === member.id
          );

          // 모든 년도의 membership 정보를 배열로 저장
          const allYearMemberships = memberships.map((m) => ({
            ...m,
            ministry: ministryInfo,
          }));

          // 첫 번째 membership 정보 사용 (기본값, 가장 최근 년도)
          const firstMembership = memberships[0];
          return {
            ...member,
            membershipPart: firstMembership?.part || null, // membership의 part
            is_active: firstMembership?.is_active !== false, // membership의 is_active
            grade: firstMembership?.grade || null, // membership의 grade
            year: firstMembership?.year || null, // membership의 year
            membershipId: firstMembership?.id || null, // membership의 id
            position: firstMembership?.position || null, // membership의 position
            leader: firstMembership?.leader || null, // membership의 leader
            ministryName: ministryInfo?.name || null,
            class: firstMembership?.class || null, // membership의 class
            // 모든 년도의 membership 정보 저장
            allMemberships: allYearMemberships,
          };
        });

        setMembers(membersWithPart);
      } else {
        // code가 없으면 모든 멤버 가져오기
        const { data: allMembers, error: membersError } = await supabase
          .from("members")
          .select("*");

        if (membersError) {
          throw membersError;
        }

        // 현재 년도와 다음 년도만 가져오기
        const currentYear = new Date().getFullYear();
        const nextYear = currentYear + 1;

        // 현재 년도와 다음 년도의 membership 데이터만 가져오기
        // (필요시 모든 년도로 확장 가능)
        const { data: allMembershipData, error: membershipError } =
          await supabase
            .from("membership")
            .select(
              "id, member_id, part, is_active, grade, year, position, leader, class, ministry_id"
            )
            .in("year", [currentYear, nextYear])
            .order("year", { ascending: false });

        if (membershipError) {
          throw membershipError;
        }

        // ministry 정보 가져오기
        const { data: allMinistryData, error: ministryError } = await supabase
          .from("ministry")
          .select("id, name");

        if (ministryError) {
          throw ministryError;
        }

        // members 데이터에 membership 정보 병합
        // 각 멤버의 모든 년도 membership 정보를 포함
        const membersWithMembership = (allMembers || []).map((member) => {
          const memberships = (allMembershipData || []).filter(
            (m) => m.member_id === member.id
          );

          // 모든 년도의 membership 정보를 배열로 저장
          const allYearMemberships = memberships.map((m) => ({
            ...m,
            ministry: allMinistryData?.find((min) => min.id === m.ministry_id),
          }));

          // 첫 번째 membership 정보 사용 (기본값, 가장 최근 년도)
          const firstMembership = memberships[0];
          const ministry = firstMembership
            ? allMinistryData?.find((m) => m.id === firstMembership.ministry_id)
            : null;

          return {
            ...member,
            membershipPart: firstMembership?.part || null,
            is_active: firstMembership
              ? firstMembership.is_active !== false
              : true, // membership이 없으면 true로 설정
            grade: firstMembership?.grade || null,
            year: firstMembership?.year || null,
            membershipId: firstMembership?.id || null, // membership의 id
            position: firstMembership?.position || null, // membership의 position
            leader: firstMembership?.leader || null, // membership의 leader
            class: firstMembership?.class || null, // membership의 class
            ministryName: ministry?.name || null,
            // 모든 년도의 membership 정보 저장
            allMemberships: allYearMemberships,
          };
        });

        setMembers(membersWithMembership);
      }
    } catch (err) {
      setError(err.message);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // ministryCode가 변경될 때 이전 데이터 초기화
    setMembers([]);
    setLoading(true);
    fetchMembers();
  }, [ministryCode]);

  const addMember = async (memberData) => {
    try {
      // part, is_active, ministryCode, grade, year, position, leader, class는 membership 테이블에만 저장
      const {
        part,
        is_active,
        ministryCode,
        grade,
        year,
        position,
        leader,
        class: classValue,
        ...memberFields
      } = memberData;

      // 1. members 테이블에 멤버 추가 (part, is_active, ministryCode, grade, year 제외)
      const { data: newMember, error: memberError } = await supabase
        .from("members")
        .insert([memberFields])
        .select()
        .single();

      if (memberError) {
        throw memberError;
      }

      // 2. ministry 정보 가져오기 (formData의 ministryCode 사용)
      if (!ministryCode) {
        throw new Error("소속을 선택해주세요.");
      }
      const { data: ministryData, error: ministryError } = await supabase
        .from("ministry")
        .select("id")
        .eq("name", ministryCode)
        .single();

      if (ministryError) {
        console.error("소속 조회 오류:", ministryError);
        throw new Error(`소속 "${ministryCode}"을(를) 찾을 수 없습니다.`);
      }

      if (!ministryData || !ministryData.id) {
        throw new Error(`소속 "${ministryCode}"을(를) 찾을 수 없습니다.`);
      }

      // 3. membership 테이블에 관계 추가 (part, grade, year, position, leader, class 포함)
      // year는 formData에서 가져오거나 현재 년도로 자동 설정
      const yearToUse = year || new Date().getFullYear();
      const { error: membershipError } = await supabase
        .from("membership")
        .insert([
          {
            member_id: newMember.id,
            ministry_id: ministryData.id,
            part: part,
            grade: grade || null,
            year: yearToUse,
            position: position || null,
            leader: leader || null,
            class: classValue || null,
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
      // part, is_active, ministryCode, grade, year, position, leader, membershipId는 membership 테이블에만 저장
      const {
        part,
        is_active,
        ministryCode,
        grade,
        year,
        position,
        leader,
        membershipId,
        ...memberFields
      } = memberData;

      // 1. members 테이블 업데이트 (part, is_active, ministryCode, grade, year, membershipId 제외)
      const { data: updatedMember, error: memberError } = await supabase
        .from("members")
        .update(memberFields)
        .eq("id", id)
        .select()
        .single();

      if (memberError) {
        throw memberError;
      }

      // 2. ministry 정보 가져오기
      if (!ministryCode) {
        throw new Error("소속을 선택해주세요.");
      }
      const { data: ministryData, error: ministryError } = await supabase
        .from("ministry")
        .select("id")
        .eq("name", ministryCode)
        .single();

      if (ministryError) {
        throw ministryError;
      }

      // 3. membershipId가 있으면 기존 membership의 ministry_id 확인
      if (membershipId) {
        // 기존 membership 정보 가져오기
        const { data: existingMembership, error: existingError } =
          await supabase
            .from("membership")
            .select("ministry_id")
            .eq("id", membershipId)
            .single();

        if (existingError) {
          throw existingError;
        }

        // 소속이 변경되었는지 확인
        if (existingMembership.ministry_id !== ministryData.id) {
          // 소속이 변경되었으면 새로운 ministry의 membership을 찾거나 생성
          const yearToUse = year || new Date().getFullYear();

          // 새로운 ministry의 해당 년도 membership이 있는지 확인
          const { data: newMembership, error: checkError } = await supabase
            .from("membership")
            .select("id")
            .eq("member_id", id)
            .eq("ministry_id", ministryData.id)
            .eq("year", yearToUse)
            .maybeSingle();

          if (checkError) {
            throw checkError;
          }

          if (newMembership) {
            // 기존 membership이 있으면 업데이트
            const { error: membershipError } = await supabase
              .from("membership")
              .update({
                part: part,
                is_active: is_active,
                grade: grade || null,
                year: yearToUse,
                position: position || null,
                leader: leader || null,
              })
              .eq("id", newMembership.id);

            if (membershipError) {
              throw membershipError;
            }
          } else {
            // 새로운 membership 생성
            const { error: membershipError } = await supabase
              .from("membership")
              .insert([
                {
                  member_id: id,
                  ministry_id: ministryData.id,
                  part: part,
                  grade: grade || null,
                  year: yearToUse,
                  position: position || null,
                  leader: leader || null,
                  is_active: is_active !== false,
                },
              ]);

            if (membershipError) {
              throw membershipError;
            }
          }
        } else {
          // 소속이 변경되지 않았으면 기존 membership 업데이트
          const { error: membershipError } = await supabase
            .from("membership")
            .update({
              part: part,
              is_active: is_active,
              grade: grade || null,
              year: year || null,
              position: position || null,
              leader: leader || null,
            })
            .eq("id", membershipId);

          if (membershipError) {
            throw membershipError;
          }
        }
      } else {
        // membershipId가 없으면 기존 방식 사용 (하위 호환성)
        const yearToUse = year || new Date().getFullYear();

        // 해당 ministry의 해당 년도 membership이 있는지 확인
        const { data: existingMembership, error: checkError } = await supabase
          .from("membership")
          .select("id")
          .eq("member_id", id)
          .eq("ministry_id", ministryData.id)
          .eq("year", yearToUse)
          .maybeSingle();

        if (checkError) {
          throw checkError;
        }

        if (existingMembership) {
          // 기존 membership이 있으면 업데이트
          const { error: membershipError } = await supabase
            .from("membership")
            .update({
              part: part,
              is_active: is_active,
              grade: grade || null,
              year: yearToUse,
              position: position || null,
              leader: leader || null,
            })
            .eq("id", existingMembership.id);

          if (membershipError) {
            throw membershipError;
          }
        } else {
          // 새로운 membership 생성
          const { error: membershipError } = await supabase
            .from("membership")
            .insert([
              {
                member_id: id,
                ministry_id: ministryData.id,
                part: part,
                grade: grade || null,
                year: yearToUse,
                position: position || null,
                leader: leader || null,
                is_active: is_active !== false,
              },
            ]);

          if (membershipError) {
            throw membershipError;
          }
        }
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
