import React from "react";
import { Link, Route, Routes } from "react-router-dom";
import AttendCalendar from "./AttendCalendar";
import AttendList from "./AttendList";
import AttendWrite from "./AttendWrite";
import AttendView from "./AttendView";
import { AttendProvider } from "../context/AttendContext";

function AttendComp() {
  return (
    <AttendProvider>
      <div>
        {/* <h3 className="text-3xl font-bold mb-6">출석관리</h3> */}
        <div className="flex gap-4">
          <Link to="/attend/calendar">Calendar</Link>
          <Link to="/attend/list">List</Link>
          {/* <Link to="/attend/write">Write</Link> */}
          <Link to="/attend/view">View</Link>
        </div>
        <Routes>
          <Route index element={<AttendCalendar />} />
          <Route path="/calendar" element={<AttendCalendar />} />
          <Route path="/list" element={<AttendList />} />
          <Route path="/write" element={<AttendWrite />} />
          <Route path="/view" element={<AttendView />} />
        </Routes>
      </div>
    </AttendProvider>
  );
}

export default AttendComp;
