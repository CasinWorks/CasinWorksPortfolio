import { Navigate } from "react-router-dom";

/** Legacy inquiry thank-you URL — send people to the public calendar. */
export default function ThankYouPage() {
  return <Navigate to="/book" replace />;
}
