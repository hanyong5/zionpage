import { createContext, useContext, useState } from "react";

const PointContext = createContext();

export const usePoint = () => {
  return useContext(PointContext);
};

export const PointProvider = ({ children }) => {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPoints = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.from("member_points").select("*");
      if (error) {
        setError(error.message);
        setPoints([]);
      } else {
        setPoints(data || []);
      }
    } catch (err) {
      setError(err.message);
      setPoints([]);
    } finally {
      setLoading(false);
    }
  };
  const value = {
    points,
    setPoints,
  };
  return (
    <PointContext.Provider value={value}>{children}</PointContext.Provider>
  );
};
