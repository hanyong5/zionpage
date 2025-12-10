import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { MemberProvider } from "./pages/context/MemberContext";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <MemberProvider>
      <StrictMode>
        <App />
      </StrictMode>
    </MemberProvider>
  </BrowserRouter>
);
