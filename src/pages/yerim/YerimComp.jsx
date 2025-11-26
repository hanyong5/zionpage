import React from "react";
import { Link, Route, Routes } from "react-router-dom";
import { YerimProvider } from "../context/YerimContext";
import YerimList from "./YerimList";
import YerimWrite from "./YerimWrite";
import YerimModi from "./YerimModi";

function YerimComp() {
  return (
    <YerimProvider>
      <div>
        <h3 className="text-3xl font-bold mb-6">멤버관리</h3>
        <div className="flex gap-4">
          <Link to="/yerim?code=시온성가대">Zion</Link>
          <Link to="/yerim?code=예루살렘성가대">Jerusalem</Link>
          <Link to="/yerim?code=중고등부">중고등부</Link>
          <Link to="/yerim/list">List</Link>
          <Link to="/yerim/write">Write</Link>
          <Link to="/yerim/modify">Modify</Link>
        </div>
      </div>
      <div className="container mx-auto">
        <Routes>
          <Route index element={<YerimList />} />
          <Route path="list" element={<YerimList />} />
          <Route path="write" element={<YerimWrite />} />
          <Route path="modify/:id" element={<YerimModi />} />
        </Routes>
      </div>
    </YerimProvider>
  );
}

export default YerimComp;
