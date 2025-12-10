import React from "react";
import HomeComp from "./pages/HomeComp";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import ZionComp from "./pages/zion/ZionComp";
import CalendarComp from "./pages/calen/CalendarComp";
import NotFound from "./pages/NotFound";
import PartyComp from "./pages/party/PartyComp";
import AttendComp from "./pages/attend/AttendComp";
import YerimComp from "./pages/yerim/YerimComp";
import PointComp from "./pages/point/PointComp";
import MemberComp from "./pages/member/MemberComp";
import { useMember } from "./pages/context/MemberContext";
import { Button } from "@/components/ui/button";

function App() {
  const { memberData, user, logout } = useMember();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      navigate("/member/login");
    }
  };

  return (
    <div className="container mx-auto">
      <nav className="flex justify-between items-center p-4">
        <h1 className="text-2xl font-bold">logo</h1>
        <div className="flex gap-4 items-center">
          {user && memberData && (
            <>
              <div className="text-sm font-medium text-muted-foreground">
                {memberData.name}
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                로그아웃
              </Button>
            </>
          )}
          {!user && <Link to="/member/login">로그인</Link>}
          <Link to="/">Home</Link>
          {/* <Link to="/zion">Members</Link> */}
          <Link to="/calen">Calendar</Link>
          {/* <Link to="/party">Party</Link> */}
          <Link to="/attend">출석부</Link>
          <Link to="/yerim">Attend</Link>
          <Link to="/point">Point</Link>
          <Link to="/member">Member</Link>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<HomeComp />} />
        <Route path="/zion/*" element={<ZionComp />} />
        <Route path="/calen/*" element={<CalendarComp />} />
        <Route path="/party/*" element={<PartyComp />} />
        <Route path="/attend/*" element={<AttendComp />} />
        <Route path="/yerim/*" element={<YerimComp />} />
        <Route path="/point/*" element={<PointComp />} />
        <Route path="/member/*" element={<MemberComp />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default App;
