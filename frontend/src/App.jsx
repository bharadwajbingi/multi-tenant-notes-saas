// src/App.jsx
import React, { useState, useEffect } from "react";
import api from "./api";
import NoteList from "./components/NoteList";
import NoteForm from "./components/NoteForm";
import UpgradeButton from "./components/UpgradeButton";
import InviteUserForm from "./components/InviteUserForm";
import "./index.css";

function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notes, setNotes] = useState([]);
  const [notesFetched, setNotesFetched] = useState(false);

  const fetchNotes = async () => {
    try {
      const res = await api.get("/notes");
      setNotes(res.data);
      setNotesFetched(true);
    } catch (error) {
      console.error("Failed to fetch notes:", error);
      setNotesFetched(true);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotes();
    }
  }, [user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/login", { email, password });
      localStorage.setItem("token", res.data.token);
      setUser(res.data.user);
    } catch (error) {
      alert("Login failed. Check your credentials.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setNotes([]);
    setNotesFetched(false);
  };

  if (!user) {
    return (
      <div className="container" style={{ maxWidth: "400px" }}>
        <h2 style={{ textAlign: "center" }}>Login</h2>
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="primary">
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="dashboard-header">
        <div>
          <h2>Notes Dashboard</h2>
          <p>
            Welcome, {user.email} (Role: {user.role}, Tenant: {user.tenant.slug}
            )
          </p>
        </div>
        <button onClick={handleLogout} className="secondary">
          Logout
        </button>
      </div>

      {user.role === "Admin" && (
        <>
          <UpgradeButton
            tenantSlug={user.tenant.slug}
            onUpgrade={() => {
              setUser((prev) => ({
                ...prev,
                tenant: { ...prev.tenant, plan: "Pro" },
              }));
              fetchNotes();
            }}
          />
          <InviteUserForm user={user} />
        </>
      )}

      <NoteForm onNoteCreated={fetchNotes} user={user} />
      <NoteList
        notes={notes}
        fetchNotes={fetchNotes}
        user={user}
        notesFetched={notesFetched}
      />
    </div>
  );
}

export default App;
