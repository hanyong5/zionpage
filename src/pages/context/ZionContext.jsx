import { createContext, useContext, useState, useEffect } from "react";
import supabase from "../../utils/supabase";
const ZionContext = createContext();

export const useZion = () => {
  return useContext(ZionContext);
};

export const ZionProvider = ({ children }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.from("members").select("*");
      if (error) {
        setError(error.message);
        setMembers([]);
      } else {
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
    fetchMembers();
  }, []);

  const addMember = async (memberData) => {
    try {
      const { data, error } = await supabase
        .from("members")
        .insert([memberData])
        .select();

      if (error) {
        throw error;
      }

      // 멤버 리스트 새로고침
      await fetchMembers();
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateMember = async (id, memberData) => {
    try {
      const { data, error } = await supabase
        .from("members")
        .update(memberData)
        .eq("id", id)
        .select();

      if (error) {
        throw error;
      }

      // 멤버 리스트 새로고침
      await fetchMembers();
      return { success: true, data };
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
    addMember,
    updateMember,
    getMemberById,
    refreshMembers: fetchMembers,
  };

  return <ZionContext.Provider value={value}>{children}</ZionContext.Provider>; // 값을 넘겨줘야 하기 때문에 Provider로 감싸줌
};
