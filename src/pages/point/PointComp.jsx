import React from "react";
import PointList from "./PointList";
import { PointProvider } from "../context/PointContext";
import { Link, Route, Routes } from "react-router-dom";
import PointQr from "./PointQr";

function PointComp() {
  return (
    <PointProvider>
      <div className="flex gap-4">
        <Link to="/point/list">List</Link>
        <Link to="/point/qr">QR</Link>
        {/* <Link to="/point/write">Write</Link>
        <Link to="/point/modify/:id">Modify</Link>
        <Link to="/point/view/:id">View</Link> */}
      </div>
      <Routes>
        <Route index element={<PointList />} />
        <Route path="list" element={<PointList />} />
        <Route path="qr" element={<PointQr />} />
      </Routes>
    </PointProvider>
  );
}

export default PointComp;
