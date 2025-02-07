"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import io from "socket.io-client";
import NewChatModal from "../components/NewChatModal";
import GroupChatModal from "../components/GroupChatModal";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL; // ✅ Global API URL
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL; // ✅ Global Socket URL

let socket;

export default function ChatPage() {
  const router = useRouter();

  // Basic states
  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const socketRef = useRef(null);

  // Typing indicator states
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // Modal states for new chats and group chats
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isGroupChatModalOpen, setIsGroupChatModalOpen] = useState(false);

  // Ref for current selectedChat (so our socket callbacks always see the latest value)
  const selectedChatRef = useRef(selectedChat);
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    } else {
      setUser({ token });
      initSocket(token);
      fetchChats(token);
    }
  }, []);

  const initSocket = (token) => {
    socketRef.current = io(SOCKET_URL, { transports: ["websocket"] });
    socket = socketRef.current;
    socket.on("connect", () => {
      socket.emit("setup", { token });
      console.log("Socket connected:", socket.id);
    });
    socket.on("message received", (newMsg) => {
      console.log("New message received:", newMsg);
      if (selectedChatRef.current && newMsg.chat._id === selectedChatRef.current._id) {
        setMessages((prev) => [...prev, newMsg]);
      }
    });
    socket.on("typing", () => {
      setIsTyping(true);
    });
    socket.on("stop typing", () => {
      setIsTyping(false);
    });
  };

  const fetchChats = async (token) => {
    try {
      const res = await fetch(`${API_BASE_URL}/chats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch chats");
      const data = await res.json();
      setChats(data);
    } catch (error) {
      console.error("Error fetching chats:", error);
    }
  };

  const handleSelectChat = async (chat) => {
    setSelectedChat(chat);
    setMessages([]);
    fetchMessages(chat._id);
    socket.emit("join chat", chat._id);
  };

  const fetchMessages = async (chatId) => {
    if (!user?.token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/messages/${chatId}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      setMessages(data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;
    try {
      const res = await fetch(`${API_BASE_URL}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          chatId: selectedChat._id,
          content: newMessage,
        }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      const savedMessage = await res.json();
      setNewMessage("");
      setMessages((prev) => [...prev, savedMessage]);
      socket.emit("new message", savedMessage);
      socket.emit("stop typing", selectedChat._id);
      setTyping(false);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (!selectedChat) return;
    if (!typing) {
      setTyping(true);
      socket.emit("typing", selectedChat._id);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop typing", selectedChat._id);
      setTyping(false);
    }, 3000);
  };

  // Callbacks when a new chat or group chat is created via modals
  const handleChatCreated = (newChat) => {
    setChats((prev) => [newChat, ...prev]);
  };
  const handleGroupChatCreated = (newGroupChat) => {
    setChats((prev) => [newGroupChat, ...prev]);
  };

  useEffect(() => {
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  return (
    <div className="h-screen flex overflow-hidden bg-gradient-to-br from-gray-100 to-gray-300">
      {/* SIDEBAR */}
      <div className="w-1/4 flex flex-col bg-gradient-to-b from-purple-800 to-purple-600 text-white shadow-lg">
        <div className="p-4 flex flex-col space-y-2 border-b border-purple-700">
          <span className="text-2xl font-bold">My Chats</span>
          <div className="flex space-x-2">
            <button
              onClick={() => setIsNewChatModalOpen(true)}
              className="px-3 py-1 bg-purple-500 rounded hover:bg-purple-400 transition"
            >
              New Chat
            </button>
            <button
              onClick={() => setIsGroupChatModalOpen(true)}
              className="px-3 py-1 bg-blue-500 rounded hover:bg-blue-400 transition"
            >
              New Group
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.map((chat) => (
            <div
              key={chat._id}
              onClick={() => handleSelectChat(chat)}
              className={`p-4 cursor-pointer border-b border-purple-700 transition-all hover:bg-purple-500 ${
                selectedChat?._id === chat._id && "bg-purple-400 font-semibold"
              }`}
            >
              {chat.isGroupChat
                ? chat.chatName
                : getChatName(chat, user?.token)}
            </div>
          ))}
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="w-3/4 flex flex-col bg-white shadow-inner">
        <div className="h-16 flex items-center px-6 bg-gradient-to-r from-purple-100 to-purple-50 border-b border-gray-200">
          {selectedChat ? (
            <h2 className="text-xl font-bold text-gray-800">
              {selectedChat.isGroupChat
                ? selectedChat.chatName
                : getChatName(selectedChat, user?.token)}
            </h2>
          ) : (
            <span className="text-gray-500">Select a chat to start messaging</span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
          {selectedChat ? (
            <>
              {messages.length > 0 ? (
                messages.map((msg) => (
                  <div
                    key={msg._id}
                    className={`flex ${
                      msg.sender._id === getUserIdFromToken(user?.token)
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-md p-3 rounded-xl shadow-md ${
                        msg.sender._id === getUserIdFromToken(user?.token)
                          ? "bg-purple-600 text-white"
                          : "bg-gray-200 text-gray-800"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500">No messages yet.</p>
              )}
              {isTyping && (
                <div className="ml-2 text-sm text-gray-500 italic">
                  Someone is typing...
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-gray-500">Please select a chat.</p>
          )}
        </div>
        {selectedChat && (
          <div className="h-20 flex items-center px-6 bg-white border-t border-gray-200">
            <input
              type="text"
              placeholder="Type your message..."
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
              value={newMessage}
              onChange={handleTyping}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendMessage();
              }}
            />
            <button
              onClick={handleSendMessage}
              className="ml-4 px-6 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition"
            >
              Send
            </button>
          </div>
        )}
      </div>

      {/* MODALS */}
      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        token={user?.token}
        onChatCreated={handleChatCreated}
      />
      <GroupChatModal
        isOpen={isGroupChatModalOpen}
        onClose={() => setIsGroupChatModalOpen(false)}
        token={user?.token}
        onGroupChatCreated={handleGroupChatCreated}
      />
    </div>
  );
}

// Helper function to get the chat name for 1-on-1 chats
function getChatName(chat, token) {
  if (chat.isGroupChat) return chat.chatName;
  if (!token) return "Chat";
  const myUserId = getUserIdFromToken(token);
  const otherUser = chat.users?.find((u) => u._id !== myUserId);
  return otherUser?.name || "Unnamed Chat";
}

// Helper function to extract user ID from the JWT token
function getUserIdFromToken(token) {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    const decodedPayload = JSON.parse(atob(payload));
    return decodedPayload.userId;
  } catch (error) {
    console.error("Invalid token or parse error:", error);
    return null;
  }
}
