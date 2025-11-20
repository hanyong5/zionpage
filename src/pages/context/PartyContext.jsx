import { createContext, useContext, useState, useEffect } from "react";
import supabase from "../../utils/supabase";

const PartyContext = createContext();

export const useParty = () => {
  return useContext(PartyContext);
};

export const PartyProvider = ({ children }) => {
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchParties = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("party")
        .select("*")
        .order("party_date", { ascending: false });
      if (error) {
        setError(error.message);
        setParties([]);
      } else {
        setParties(data || []);
      }
    } catch (err) {
      setError(err.message);
      setParties([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParties();
  }, []);

  const addParty = async (partyData) => {
    try {
      const { data, error } = await supabase
        .from("party")
        .insert([partyData])
        .select();

      if (error) {
        throw error;
      }

      // 파티 리스트 새로고침
      await fetchParties();
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateParty = async (id, partyData) => {
    try {
      const { data, error } = await supabase
        .from("party")
        .update(partyData)
        .eq("id", id)
        .select();

      if (error) {
        throw error;
      }

      // 파티 리스트 새로고침
      await fetchParties();
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const getPartyById = (id) => {
    return parties.find((party) => party.id === parseInt(id));
  };

  const deleteParty = async (id) => {
    try {
      const { error } = await supabase.from("party").delete().eq("id", id);

      if (error) {
        throw error;
      }

      // 파티 리스트 새로고침
      await fetchParties();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // party_members 관련 함수들
  const fetchPartyMembers = async (partyId) => {
    try {
      const { data, error } = await supabase
        .from("party_members")
        .select("*")
        .eq("party_id", partyId);

      if (error) {
        throw error;
      }

      return { success: true, data: data || [] };
    } catch (err) {
      return { success: false, error: err.message, data: [] };
    }
  };

  const addPartyMember = async (partyMemberData) => {
    try {
      const { data, error } = await supabase
        .from("party_members")
        .insert([partyMemberData])
        .select();

      if (error) {
        throw error;
      }

      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updatePartyMember = async (id, partyMemberData) => {
    try {
      const { data, error } = await supabase
        .from("party_members")
        .update(partyMemberData)
        .eq("id", id)
        .select();

      if (error) {
        throw error;
      }

      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const getPartyMemberByPartyAndMember = async (partyId, memberId) => {
    try {
      const { data, error } = await supabase
        .from("party_members")
        .select("*")
        .eq("party_id", partyId)
        .eq("member_id", memberId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message, data: null };
    }
  };

  const value = {
    parties,
    loading,
    error,
    addParty,
    updateParty,
    deleteParty,
    getPartyById,
    refreshParties: fetchParties,
    fetchPartyMembers,
    addPartyMember,
    updatePartyMember,
    getPartyMemberByPartyAndMember,
  };

  return (
    <PartyContext.Provider value={value}>{children}</PartyContext.Provider>
  );
};
