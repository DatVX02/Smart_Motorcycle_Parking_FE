import { Navigate, useLocation } from "react-router-dom";
import authService from "../services/authService";

function ProtectedRoute({ children }) {
  const location = useLocation();
  const isAuthenticated = authService.isAuthenticated();

  if (!isAuthenticated) {
    // Lưu lại trang đang muốn vào, sau login sẽ redirect về đây
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;
