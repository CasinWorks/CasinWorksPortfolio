import { Outlet } from "react-router-dom";
import { PortalAuthProvider } from "./auth";
import "./portal.css";

export function PortalAuthLayout() {
  return (
    <PortalAuthProvider>
      <div className="portal-ui">
        <Outlet />
      </div>
    </PortalAuthProvider>
  );
}
