import React from "react";
import PartList from "./PartList";
import PartyWrite from "./PartyWrite";
import PartyModi from "./PartyModi";
import PartyView from "./PartyView";
import Attend from "./Attend";
import AttendList from "./AttendList";
import { Link, Route, Routes } from "react-router-dom";
import { PartyProvider } from "../context/PartyContext";
import { ZionProvider } from "../context/ZionContext";

function PartyComp() {
  return (
    <ZionProvider>
      <PartyProvider>
        <div>
          <h3 className="text-3xl font-bold mb-6">모임관리하기</h3>
          <div className="flex gap-4">
            <Link to="/party/partlist">PartList</Link>
            <Link to="/party/write">Write</Link>
            <Link to="/party/attend">Attend</Link>
          </div>

          <Routes>
            <Route index element={<PartList />} />
            <Route path="/partlist" element={<PartList />} />
            <Route path="/write" element={<PartyWrite />} />
            <Route path="/modify/:id" element={<PartyModi />} />
            <Route path="/view/:id" element={<PartyView />} />
            <Route path="/attend" element={<AttendList />} />
            <Route path="/attend/:partyId" element={<Attend />} />

            {/* <Route path="*" element={<NotFound />} /> */}
          </Routes>
        </div>
      </PartyProvider>
    </ZionProvider>
  );
}

export default PartyComp;
