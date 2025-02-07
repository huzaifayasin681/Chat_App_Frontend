"use client";

import React, { useState, useEffect } from "react";
import { XMarkIcon, MagnifyingGlassIcon, UserPlusIcon, UserCircleIcon } from "@heroicons/react/24/outline";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;


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
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Create Group Chat</h2>
            <button
              onClick={onClose}
              className="p-1 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Group Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group Name
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Enter group name"
                className="w-full pl-4 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>
          </div>

          {/* User Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Members
            </label>
            <div className="relative">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search users..."
                  className="w-full pl-11 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <button
                  onClick={handleSearch}
                  className="px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors flex items-center"
                  disabled={loadingSearch}
                >
                  {loadingSearch ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <MagnifyingGlassIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-4 top-4 text-gray-400" />
            </div>
          </div>

          {/* Selected Users */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Selected Members ({selectedUsers.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {selectedUsers.length > 0 ? (
                selectedUsers.map((user) => (
                  <div
                    key={user._id}
                    className="bg-blue-50/50 border border-blue-200 rounded-full px-3 py-1 flex items-center gap-2"
                  >
                    <UserCircleIcon className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">{user.name}</span>
                    <button
                      onClick={() => removeUserFromGroup(user._id)}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-gray-400 text-sm">
                  No members selected yet
                </div>
              )}
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Search Results
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {searchResults.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <UserCircleIcon className="w-6 h-6 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => addUserToGroup(user)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                    >
                      <UserPlusIcon className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-5 py-2 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateGroupChat}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors flex items-center gap-2"
          >
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
}
