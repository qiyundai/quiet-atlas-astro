import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import "./styles/globals.css";
export default function KingsAdmin() {
  return (
    <div className="kings-admin">
      <BrowserRouter basename="/games/kings-search">
        <App />
      </BrowserRouter>
    </div>
  );
}
