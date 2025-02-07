"use client";

import React, { useState, useEffect } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL; // ✅ Global API URL

export default function GroupChatModal({ isOpen, onClose, token, onGroupChatCreated }) {
  const [groupName, setGroupName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen]);

  const resetState = () => {
    setGroupName("");
    setSearchTerm("");
    setSearchResults([]);
    setSelectedUsers([]);
    setError("");
    setLoadingSearch(false);
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    try {
      setLoadingSearch(true);
      setError("");
      const res = await fetch(`${API_BASE_URL}/users/search?q=${encodeURIComponent(searchTerm)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error("Group Chat Search Error:", err);
      setError("Error searching users");
    } finally {
      setLoadingSearch(false);
    }
  };

  const addUserToGroup = (user) => {
    if (!selectedUsers.find((u) => u._id === user._id)) {
      setSelectedUsers((prev) => [...prev, user]);
    }
  };

  const removeUserFromGroup = (userId) => {
    setSelectedUsers((prev) => prev.filter((u) => u._id !== userId));
  };

  const handleCreateGroupChat = async () => {
    if (!groupName.trim() || selectedUsers.length < 2) {
      setError("Please enter a group name and select at least 2 users.");
      return;
    }
    try {
      const userIds = selectedUsers.map((u) => u._id);
      const res = await fetch(`${API_BASE_URL}/chats/group`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: groupName,
          users: JSON.stringify(userIds),
        }),
      });
      if (!res.ok) throw new Error("Failed to create group chat");
      const groupChat = await res.json();
      onGroupChatCreated(groupChat);
      onClose();
    } catch (err) {
      console.error("Error creating group chat:", err);
      setError("Error creating group chat");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded shadow-lg w-full max-w-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Create Group Chat</h2>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        <input
          type="text"
          placeholder="Group Chat Name"
          className="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
        />
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search users by name or email..."
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button
            onClick={handleSearch}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {loadingSearch ? "Searching..." : "Search"}
          </button>
        </div>
        <div className="mb-4">
          <h3 className="font-semibold">Selected Users:</h3>
          {selectedUsers.length > 0 ? (
            <div className="flex flex-wrap mt-2">
              {selectedUsers.map((user) => (
                <div key={user._id} className="bg-gray-200 rounded-full px-3 py-1 mr-2 mb-2 flex items-center">
                  <span>{user.name}</span>
                  <button onClick={() => removeUserFromGroup(user._id)} className="ml-1 text-red-600">&times;</button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No users selected.</p>
          )}
        </div>
        <div className="mb-4">
          <h3 className="font-semibold">Search Results:</h3>
          {searchResults.length > 0 ? (
            <div className="max-h-48 overflow-y-auto mt-2">
              {searchResults.map((user) => (
                <div key={user._id} className="flex justify-between items-center p-2 border-b">
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  <button onClick={() => addUserToGroup(user)} className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600">
                    Add
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No results found.</p>
          )}
        </div>
        <div className="flex justify-end space-x-4">
          <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-100">
            Cancel
          </button>
          <button onClick={handleCreateGroupChat} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Create Group Chat
          </button>
        </div>
      </div>
    </div>
  );
}
