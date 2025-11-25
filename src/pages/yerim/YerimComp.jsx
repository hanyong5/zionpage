import React from "react";
import { Route, Routes } from "react-router-dom";
import { YerimProvider } from "../context/YerimContext";
import YerimList from "./YerimList";
import YerimWrite from "./YerimWrite";
import YerimModi from "./YerimModi";

function YerimComp() {
  return (
    <YerimProvider>
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
