import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { PulseAuthProvider } from "./paisa-pulse/context/PulseAuthContext.jsx";
import { PulseThemeProvider } from "./paisa-pulse/context/PulseThemeContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <PulseThemeProvider>
        <PulseAuthProvider>
          <App />
        </PulseAuthProvider>
      </PulseThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
