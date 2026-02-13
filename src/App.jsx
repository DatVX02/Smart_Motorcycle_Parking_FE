import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Layout from "./components/layout/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import Accounts from "./pages/Accounts/Accounts";
import ParkingLots from "./pages/ParkingLots/ParkingLots";
import Transactions from "./pages/Transactions/Transactions";
import Shifts from "./pages/Shifts/Shifts";
import SystemLogs from "./pages/SystemLogs/SystemLogs";
import RewardPoints from "./pages/RewardPoints/RewardPoints";
import PriceList from "./pages/PriceList/PriceList";
import IoTDevices from "./pages/IoTDevices/IoTDevices";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="parking-lots" element={<ParkingLots />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="shifts" element={<Shifts />} />
          <Route path="system-logs" element={<SystemLogs />} />
          <Route path="reward-points" element={<RewardPoints />} />
          <Route path="price-list" element={<PriceList />} />
          <Route path="iot-devices" element={<IoTDevices />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
