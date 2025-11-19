import { createContext, useContext, useState, useEffect } from "react";
import supabase from "../../utils/supabase";
import holidaysData from "../../data/holidays.json";
import eventsData from "../../data/eventday.json";

const CalenContext = createContext();

export const useCalen = () => {
  return useContext(CalenContext);
};

export const CalenProvider = ({ children }) => {
  const [events, setEvents] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadEvents = () => {
    try {
      // JSON 파일에서 행사일정 데이터 로드
      const eventsList = eventsData.map((event, index) => ({
        id: event.id || index + 1,
        event_date: event.event_date,
        title: event.title,
        description: event.description || null,
        location: event.location || null,
        time: event.time || null,
      }));
      // 날짜순으로 정렬
      eventsList.sort((a, b) => {
        return new Date(a.event_date) - new Date(b.event_date);
      });
      setEvents(eventsList);
    } catch (err) {
      console.error("행사일정 로드 오류:", err.message);
      setError(err.message);
      setEvents([]);
    }
  };

  const loadHolidays = () => {
    try {
      // JSON 파일에서 공휴일 데이터 로드
      const holidaysList = holidaysData.map((holiday) => ({
        holiday_date: holiday.date,
        name: holiday.name,
        holiday_name: holiday.name,
      }));
      setHolidays(holidaysList);
    } catch (err) {
      console.error("공휴일 로드 오류:", err.message);
      setHolidays([]);
    }
  };

  const fetchSongs = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .order("singdate", { ascending: false });
      if (error) {
        setError(error.message);
        setSongs([]);
      } else {
        setSongs(data || []);
      }
    } catch (err) {
      setError(err.message);
      setSongs([]);
    } finally {
      setLoading(false);
    }
  };

  const addSong = async (songData) => {
    try {
      const { data, error } = await supabase
        .from("calendar_events")
        .insert([songData])
        .select();

      if (error) {
        throw error;
      }

      // 찬양 리스트 새로고침
      await fetchSongs();
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateSong = async (id, songData) => {
    try {
      const { data, error } = await supabase
        .from("calendar_events")
        .update(songData)
        .eq("id", id)
        .select();

      if (error) {
        throw error;
      }

      // 찬양 리스트 새로고침
      await fetchSongs();
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const getSongById = (id) => {
    return songs.find((song) => song.id === parseInt(id));
  };

  useEffect(() => {
    setLoading(true);
    loadEvents();
    loadHolidays();
    fetchSongs();
    setLoading(false);
  }, []);

  const value = {
    events,
    setEvents,
    holidays,
    setHolidays,
    songs,
    setSongs,
    loading,
    setLoading,
    error,
    setError,
    refreshEvents: loadEvents,
    refreshHolidays: loadHolidays,
    refreshSongs: fetchSongs,
    addSong,
    updateSong,
    getSongById,
  };

  return (
    <CalenContext.Provider value={value}>{children}</CalenContext.Provider>
  );
};
