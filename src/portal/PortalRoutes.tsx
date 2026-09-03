import { Outlet } from "react-router-dom";
import { MotionConfig } from "motion/react";
import { PortalAuthProvider } from "./auth";
import { EASE } from "./motion";
import "./portal.css";

export function PortalAuthLayout() {
  return (
    <PortalAuthProvider>
      <MotionConfig reducedMotion="user" transition={{ ease: EASE }}>
        <div className="portal-ui">
          <Outlet />
        </div>
      </MotionConfig>
    </PortalAuthProvider>
  );
}
