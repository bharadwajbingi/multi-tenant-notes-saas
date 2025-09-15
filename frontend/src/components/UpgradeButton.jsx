// src/components/UpgradeButton.jsx
import React from "react";
import api from "../api";

const UpgradeButton = ({ tenantSlug, onUpgrade }) => {
  const handleUpgrade = async () => {
    if (window.confirm("Are you sure you want to upgrade to the Pro plan?")) {
      try {
        await api.post(`/tenants/${tenantSlug}/upgrade`);
        onUpgrade(); // This line was the issue. It needs to be called as a function.
        alert("Tenant plan upgraded to Pro!");
      } catch (error) {
        console.error(
          "Upgrade failed:",
          error.response?.data?.message || error.message
        );
        alert("Upgrade failed.");
      }
    }
  };

  return (
    <button
      onClick={handleUpgrade}
      className="primary"
      style={{ marginBottom: "1.5rem" }}
    >
      Upgrade to Pro Plan
    </button>
  );
};

export default UpgradeButton;
