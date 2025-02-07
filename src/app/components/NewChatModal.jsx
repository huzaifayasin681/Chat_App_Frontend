"use client";

import React, { useState, useEffect } from "react";
import { XMarkIcon, MagnifyingGlassIcon, UserCircleIcon, ArrowRightIcon } from "@heroicons/react/24/outline";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
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
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">New Chat</h2>
              <p className="text-sm text-white/90 mt-1">Start a conversation with friends or colleagues</p>
            </div>
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
          {/* Search Section */}
          <div className="space-y-4">
            <div className="relative">
              <div className="flex gap-2">
                <input
                  type="text"
                  className="w-full pl-11 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Search name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <button
                  onClick={handleSearch}
                  className="px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors flex items-center"
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <MagnifyingGlassIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-4 top-4 text-gray-400" />
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
          </div>

          {/* Search Results */}
          <div className="space-y-4">
            {searchResults.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {searchResults.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer group"
                    onClick={() => handleCreateChat(user._id)}
                  >
                    <div className="flex items-center gap-3">
                      <UserCircleIcon className="w-8 h-8 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <button className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRightIcon className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              !isSearching && (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">No users found</div>
                  <p className="text-sm text-gray-500">Try searching by name or email address</p>
                </div>
              )
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t">
          <button
            onClick={onClose}
            className="w-full py-3 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}