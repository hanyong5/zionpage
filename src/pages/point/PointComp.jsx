import React from "react";
import PointList from "./PointList";
import { PointProvider } from "../context/PointContext";
import { Link, Route, Routes } from "react-router-dom";

function PointComp() {
  return (
    <PointProvider>
      <div>PointComp</div>
      <nav>
        <Link to="/point/list">List</Link>
        {/* <Link to="/point/write">Write</Link>
        <Link to="/point/modify/:id">Modify</Link>
        <Link to="/point/view/:id">View</Link> */}
      </nav>
      <Routes>
        <Route index element={<PointList />} />
        <Route path="list" element={<PointList />} />
      </Routes>
    </PointProvider>
  );
}

export default PointComp;
