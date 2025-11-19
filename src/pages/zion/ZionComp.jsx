import React, { useEffect } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { ZionProvider } from "../context/ZionContext";
import ZionList from "./ZionList";
import ZionWrite from "./ZionWrite";
import ZionModi from "./ZionModi";

function BoardComp() {
  return (
    <ZionProvider>
      <div className="container mx-auto">
        <nav className="flex items-center p-4">
          <div className="flex gap-4">
            <Link to="/zion/list">Members</Link>
            <Link to="/zion/write">Write</Link>
            <Link to="/zion/modify">Modify</Link>
          </div>
        </nav>
        <Routes>
          <Route index element={<ZionList />} />
          <Route path="list" element={<ZionList />} />
          <Route path="write" element={<ZionWrite />} />
          <Route path="modify/:id" element={<ZionModi />} />
        </Routes>
      </div>
    </ZionProvider>
  );
}

export default BoardComp;
