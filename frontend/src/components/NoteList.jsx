// src/components/NoteList.jsx
import React from "react";
import api from "../api";

const NoteList = ({ notes, fetchNotes, user, notesFetched }) => {
  const handleDelete = async (noteId) => {
    try {
      await api.delete(`/notes/${noteId}`);
      fetchNotes();
    } catch (error) {
      console.error("Failed to delete note:", error);
      alert("Failed to delete note.");
    }
  };

  if (!notesFetched) {
    return (
      <div className="card" style={{ textAlign: "center" }}>
        Loading notes...
      </div>
    );
  }

  return (
    <div>
      <h3>Your Notes</h3>
      {user.tenant.plan === "Free" && notes.length >= 3 && (
        <div className="alert error">
          Note limit reached! Upgrade to Pro for unlimited notes.
        </div>
      )}
      {notes.length === 0 ? (
        <div className="card" style={{ textAlign: "center" }}>
          No notes yet. Create one!
        </div>
      ) : (
        <div className="notes-container">
          {notes.map((note) => (
            <div key={note._id} className="card note-card">
              <h4>{note.title}</h4>
              <p>{note.content}</p>
              <button
                onClick={() => handleDelete(note._id)}
                className="secondary"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NoteList;
