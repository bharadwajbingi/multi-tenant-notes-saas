// src/components/NoteForm.jsx
import React, { useState } from "react";
import api from "../api";

const NoteForm = ({ onNoteCreated, user }) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/notes", { title, content });
      setTitle("");
      setContent("");
      onNoteCreated();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to create note.");
    }
  };

  return (
    <div className="card" style={{ marginBottom: "2rem" }}>
      <h3>Create a New Note</h3>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Note Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          placeholder="Note Content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
        <button type="submit" className="primary">
          Create Note
        </button>
      </form>
    </div>
  );
};

export default NoteForm;
