import React from "react";
import LoginPage from "./LoginPage";
import { Link, Route, Routes } from "react-router-dom";
import MemberList from "./MemberList";

function MemberComp() {
  return (
    <div>
      <div>
        <Link to="/member/login">Login</Link>
        <Link to="/member/list">List</Link>
      </div>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/list" element={<MemberList />} />
      </Routes>
    </div>
  );
}

export default MemberComp;
