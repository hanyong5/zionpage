import React from "react";
import { Link, Route, Routes } from "react-router-dom";
import { YerimProvider } from "../context/YerimContext";
import YerimList from "./YerimList";
import YerimWrite from "./YerimWrite";
import YerimModi from "./YerimModi";
import YerimMember from "./YerimMember";
import YerimMemberList from "./YerimMemberList";
import YerimMemberWrite from "./YerimMemberWrite";

function YerimComp() {
  return (
    <YerimProvider>
      <div>
        {/* <h3 className="text-3xl font-bold mb-6">멤버관리</h3> */}
        <div className="flex gap-4">
          <Link to="/yerim?code=시온성가대">2부</Link>
          <Link to="/yerim?code=예루살렘성가대">3부</Link>

          <Link to="/yerim?code=초등부">초등부</Link>
          <Link to="/yerim?code=유년부">유년부</Link>
          <Link to="/yerim?code=중고등부">중고등부</Link>
          <Link to="/yerim/list">List</Link>
          <Link to="/yerim/member-list">Member List</Link>
          <Link to="/yerim/write">Write</Link>
        </div>
      </div>
      <div className="container mx-auto">
        <Routes>
          <Route index element={<YerimList />} />
          <Route path="list" element={<YerimList />} />
          <Route path="write" element={<YerimWrite />} />
          <Route path="modify/:id" element={<YerimModi />} />
          <Route path="member-list" element={<YerimMemberList />} />
          <Route path="member-write" element={<YerimMemberWrite />} />
          <Route path="member/:id" element={<YerimMember />} />
        </Routes>
      </div>
    </YerimProvider>
  );
}

export default YerimComp;
