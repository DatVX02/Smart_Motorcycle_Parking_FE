import {
  BrowserRouter as Router,
  Routes,
  Routes,
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
import DeviceEvents from "./pages/DeviceEvents/DeviceEvents";
import RewardPoints from "./pages/RewardPoints/RewardPoints";
import PriceList from "./pages/PriceList/PriceList";
import IoTDevices from "./pages/IoTDevices/IoTDevices";
import AccountStaff from "./pages/Accounts/AccountStaff";
import DeviceMaintenance from "./pages/DeviceMaintenance/DeviceMaintenance";
import MonthlyPasses from "./pages/MonthlyPasses/MonthlyPasses";
import MonthlyPassPackages from "./pages/MonthlyPasses/MonthlyPassPackages";
import UserMonthlyPasses from "./pages/MonthlyPasses/UserMonthlyPasses";
import ParkingSessions from "./pages/ParkingSessions/ParkingSessions";
import ParkingVehicles from "./pages/ParkingVehicles/ParkingVehicles";
import IncidentReports from "./pages/IncidentReports/IncidentReports";
import RecognitionLogs from "./pages/RecognitionLogs/RecognitionLogs";
import PayByPlate from "./pages/PayByPlate/PayByPlate";
import WithdrawRequests from "./pages/WithdrawRequest/WithdrawRequests";
import Settings from "./pages/Settings/Settings";

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/pay-by-plate" element={<PayByPlate />} />

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
          <Route path="settings" element={<Settings />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="accounts/staff" element={<AccountStaff />} />
          <Route path="parking-lots" element={<ParkingLots />} />
          <Route path="parking-sessions" element={<ParkingSessions />} />
          <Route path="parking-vehicles" element={<ParkingVehicles />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="withdraw-requests" element={<WithdrawRequests />} />
          <Route path="shifts" element={<Shifts />} />
          <Route path="device-events" element={<DeviceEvents />} />
          <Route path="recognition-logs" element={<RecognitionLogs />} />
          <Route path="incident-reports" element={<IncidentReports />} />
          <Route path="reward-points" element={<RewardPoints />} />
          <Route path="price-list" element={<PriceList />} />
          <Route path="monthly-passes" element={<MonthlyPasses />} />
          <Route
            path="monthly-passes/packages"
            element={<MonthlyPassPackages />}
          />
          <Route path="monthly-passes/users" element={<UserMonthlyPasses />} />
          <Route path="iot-devices" element={<IoTDevices />} />
          <Route path="device-maintenance" element={<DeviceMaintenance />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
