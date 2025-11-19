import React from "react";
import { Link, Route, Routes } from "react-router-dom";
import { CalenProvider } from "../context/CalenContext";
import Calendar from "./Calendar";
import CalenList from "./CalenList";
import CalenWrite from "./CalenWrite";
import CalenModi from "./CalenModi";
import CalenView from "./CalenView";

function CalendarComp() {
  return (
    <CalenProvider>
      <div className="container mx-auto">
        <div className="flex items-center p-4">
          <div className="flex gap-4">
            <Link to="/calen/calendar">Calendar</Link>
            <Link to="/calen/list">List</Link>
            <Link to="/calen/write">Write</Link>
          </div>
        </div>
        <Routes>
          <Route index element={<Calendar />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="list" element={<CalenList />} />
          <Route path="write" element={<CalenWrite />} />
          <Route path="modify/:id" element={<CalenModi />} />
          <Route path="view/:id" element={<CalenView />} />
        </Routes>
      </div>
    </CalenProvider>
  );
}

export default CalendarComp;
