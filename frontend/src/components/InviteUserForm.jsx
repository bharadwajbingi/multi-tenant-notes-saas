// src/components/InviteUserForm.jsx
import React, { useState } from "react";
import api from "../api";

const InviteUserForm = ({ user }) => {
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/users/invite", { username, role: "Member" });
      setMessage(
        `✅ Successfully invited user: ${res.data.user.email} with role ${res.data.user.role}. Default password is 'password'`
      );
      setUsername("");
    } catch (error) {
      setMessage(
        `❌ Failed to invite user: ${
          error.response?.data?.message || error.message
        }`
      );
      console.error("Invite user error:", error.response?.data);
    }
  };

  return (
    <div className="card" style={{ marginBottom: "2rem" }}>
      <h3>Invite New Member</h3>
      <form onSubmit={handleSubmit}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <span style={{ color: "var(--color-text-light)" }}>
            @{user.tenant.slug}.test
          </span>
        </div>
        <button type="submit" className="primary">
          Invite User
        </button>
      </form>
      {message && (
        <p
          className={message.startsWith("✅") ? "alert success" : "alert error"}
        >
          {message}
        </p>
      )}
    </div>
  );
};

export default InviteUserForm;
