"use client";

import React, { useState, useEffect } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL; // ✅ Global API URL

export default function NewChatModal({ isOpen, onClose, token, onChatCreated }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen]);

  const resetState = () => {
    setSearchTerm("");
    setSearchResults([]);
    setError("");
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    try {
      setIsSearching(true);
      setError("");
      const res = await fetch(`${API_BASE_URL}/users/search?q=${encodeURIComponent(searchTerm)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Search Error:", error);
      setError("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreateChat = async (userId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/chats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Failed to create chat");
      const chatData = await res.json();
      onChatCreated(chatData);
      onClose(); // Close modal
    } catch (error) {
      console.error("Chat Creation Error:", error);
      setError("Error creating chat. Please try again.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="bg-white rounded shadow-lg w-full max-w-lg p-6">
        <h2 className="text-xl font-semibold mb-2">New Chat</h2>
        <p className="text-gray-600 text-sm mb-4">Find a user by name or email to start a 1-on-1 chat.</p>

        <div className="flex space-x-2 mb-4">
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none"
          >
            {isSearching ? "Searching..." : "Search"}
          </button>
        </div>

        {error && <div className="text-red-500 font-semibold mb-2">{error}</div>}

        <div className="max-h-64 overflow-y-auto border-t pt-2">
          {searchResults.length > 0 ? (
            searchResults.map((user) => (
              <div key={user._id} className="p-2 hover:bg-blue-50 flex justify-between items-center rounded">
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                <button
                  onClick={() => handleCreateChat(user._id)}
                  className="text-sm bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                >
                  Chat
                </button>
              </div>
            ))
          ) : (
            !isSearching && <p className="text-gray-500 text-sm">No users found</p>
          )}
        </div>

        <div className="mt-4 text-right">
          <button onClick={onClose} className="py-1 px-3 rounded border border-gray-300 hover:bg-gray-100">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
