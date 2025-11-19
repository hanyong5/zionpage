import React from "react";
import { cn } from "./lib/utils";
import HomeComp from "./pages/HomeComp";
import { Link, Route, Routes } from "react-router-dom";
import ZionComp from "./pages/zion/ZionComp";
import CalendarComp from "./pages/calen/CalendarComp";

function App() {
  return (
    <div className="container mx-auto">
      <nav className="flex justify-between items-center p-4">
        <h1 className="text-2xl font-bold">logo</h1>
        <div className="flex gap-4">
          <Link to="/">Home</Link>
          <Link to="/zion">Members</Link>
          <Link to="/calen">Calendar</Link>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<HomeComp />} />

        <Route path="/zion/*" element={<ZionComp />} />
        <Route path="/calen/*" element={<CalendarComp />} />
      </Routes>
    </div>
  );
}

export default App;
