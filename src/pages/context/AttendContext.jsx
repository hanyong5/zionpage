import { createContext, useContext, useState, useEffect } from "react";
import supabase from "../../utils/supabase";

const AttendContext = createContext();

export const useAttend = () => {
  return useContext(AttendContext);
};

export const AttendProvider = ({ children }) => {
  const [attendances, setAttendances] = useState([]);

  const value = {
    attendances,
    setAttendances,
  };

  return (
    <AttendContext.Provider value={value}>{children}</AttendContext.Provider>
  );
};
