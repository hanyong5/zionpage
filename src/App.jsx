import React from "react";
import { cn } from "./lib/utils";
import HomeComp from "./pages/HomeComp";
import { Link, Route, Routes } from "react-router-dom";
import ZionComp from "./pages/zion/ZionComp";
import CalendarComp from "./pages/calen/CalendarComp";
import NotFound from "./pages/NotFound";
import PartyComp from "./pages/party/PartyComp";
import AttendComp from "./pages/attend/AttendComp";

function App() {
  return (
    <div className="container mx-auto">
      <nav className="flex justify-between items-center p-4">
        <h1 className="text-2xl font-bold">logo</h1>
        <div className="flex gap-4">
          <Link to="/">Home</Link>
          <Link to="/zion">Members</Link>
          <Link to="/calen">Calendar</Link>
          <Link to="/party">Party</Link>
          <Link to="/attend">Attend</Link>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<HomeComp />} />
        <Route path="/zion/*" element={<ZionComp />} />
        <Route path="/calen/*" element={<CalendarComp />} />
        <Route path="/party/*" element={<PartyComp />} />
        <Route path="/attend/*" element={<AttendComp />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default App;
