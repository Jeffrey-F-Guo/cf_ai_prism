import { useState } from "react";
import { Nav } from "./components/Nav";
import { ReviewPage } from "./layout/ReviewPage";
import { Dashboard } from "./components/dashboard/Dashboard";

export default function App() {
  const [activeTab, setActiveTab] = useState<"review" | "dashboard">("review");

  return (
    <>
      <Nav activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === "dashboard" ? <Dashboard /> : <ReviewPage />}
    </>
  );
}
