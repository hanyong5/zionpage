import React from "react";
import HomeComp from "./pages/HomeComp";
import { Route, Routes } from "react-router-dom";
import ZionComp from "./pages/zion/ZionComp";
import CalendarComp from "./pages/calen/CalendarComp";
import NotFound from "./pages/NotFound";
import PartyComp from "./pages/party/PartyComp";
import AttendComp from "./pages/attend/AttendComp";
import YerimComp from "./pages/yerim/YerimComp";
import PointComp from "./pages/point/PointComp";
import MemberComp from "./pages/member/MemberComp";
import SelectorComp from "./pages/selector/SelectorComp";
import Navigation from "./components/Navigation";
import BottomNavigation from "./components/BottomNavigation";

function App() {
  return (
    <div className="container mx-auto pb-20">
      <Navigation />

      <Routes>
        <Route path="/" element={<HomeComp />} />
        <Route path="/zion/*" element={<ZionComp />} />
        <Route path="/calen/*" element={<CalendarComp />} />
        <Route path="/party/*" element={<PartyComp />} />
        <Route path="/attend/*" element={<AttendComp />} />
        <Route path="/yerim/*" element={<YerimComp />} />
        <Route path="/point/*" element={<PointComp />} />
        <Route path="/member/*" element={<MemberComp />} />
        <Route path="/selector/*" element={<SelectorComp />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      <BottomNavigation />
    </div>
  );
}

export default App;
