"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import io from "socket.io-client";
import NewChatModal from "../components/NewChatModal";
import GroupChatModal from "../components/GroupChatModal";
import { PaperAirplaneIcon, UserCircleIcon, UsersIcon ,PaperClipIcon,FaceSmileIcon} from "@heroicons/react/24/outline";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

let socket;

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isGroupChatModalOpen, setIsGroupChatModalOpen] = useState(false);

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initSocket = (token) => {
    socketRef.current = io(SOCKET_URL, { transports: ["websocket"] });
    socket = socketRef.current;
    socket.on("connect", () => {
      socket.emit("setup", { token });
    });
    socket.on("message received", (newMsg) => {
      if (selectedChatRef.current && newMsg.chat._id === selectedChatRef.current._id) {
        setMessages((prev) => [...prev, newMsg]);
      } else {
        setUnreadCounts((prev) => {
          const chatId = newMsg.chat._id;
          return { ...prev, [chatId]: (prev[chatId] || 0) + 1 };
        });
      }
    });
    socket.on("typing", () => setIsTyping(true));
    socket.on("stop typing", () => setIsTyping(false));
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
    // Clear unread count for the selected chat when it is opened
    setUnreadCounts((prev) => {
      const newCounts = { ...prev };
      newCounts[chat._id] = 0;
      return newCounts;
    });
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
    <div className="h-screen flex bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Left sidebar */}
      <div className="w-96 bg-white/80 backdrop-blur-lg border-r border-gray-100 flex flex-col shadow-xl">
        <div className="p-6 bg-white/90 border-b border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900 bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
              Chat App
            </h1>
            <div className="flex gap-2">
              <button
                onClick={() => setIsNewChatModalOpen(true)}
                className="p-2 bg-white shadow-sm rounded-xl hover:shadow-md transition-shadow"
              >
                <UserCircleIcon className="w-6 h-6 text-purple-600" />
              </button>
              <button
                onClick={() => setIsGroupChatModalOpen(true)}
                className="p-2 bg-white shadow-sm rounded-xl hover:shadow-md transition-shadow"
              >
                <UsersIcon className="w-6 h-6 text-blue-500" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {chats.map((chat) => (
            <div
              key={chat._id}
              onClick={() => handleSelectChat(chat)}
              className={`group relative mb-2 p-4 cursor-pointer rounded-xl transition-all ${
                selectedChat?._id === chat._id 
                  ? "bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-100 shadow-sm"
                  : "hover:bg-gray-50/80"
              }`}
            >
              <div className="flex items-center">
                <div className="relative flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center">
                  {chat.isGroupChat ? (
                    <UsersIcon className="w-6 h-6 text-purple-600" />
                  ) : (
                    <UserCircleIcon className="w-6 h-6 text-blue-500" />
                  )}
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                </div>
                <div className="ml-4 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {chat.isGroupChat ? chat.chatName : getChatName(chat, user?.token)}
                    </h3>
                    {unreadCounts[chat._id] > 0 && (
                      <span className="ml-2 bg-purple-600 text-white rounded-full px-2 py-1 text-xs font-medium">
                        {unreadCounts[chat._id]}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {chat.latestMessage?.content || "Say hello! 👋"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            <div className="p-6 bg-white/90 border-b border-gray-100">
              <div className="flex items-center">
                <div className="relative flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center">
                  {selectedChat.isGroupChat ? (
                    <UsersIcon className="w-6 h-6 text-purple-600" />
                  ) : (
                    <UserCircleIcon className="w-6 h-6 text-blue-500" />
                  )}
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                </div>
                <div className="ml-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedChat.isGroupChat
                      ? selectedChat.chatName
                      : getChatName(selectedChat, user?.token)}
                  </h2>
                  {isTyping && (
                    <p className="text-sm text-gray-500 italic animate-pulse">
                      typing...
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-white to-purple-50/50">
              {messages.map((msg) => (
                <div
                  key={msg._id}
                  className={`flex ${msg.sender._id === getUserIdFromToken(user?.token) ? "justify-end" : "justify-start"} mb-4`}
                >
                  <div
                    className={`max-w-xl p-4 rounded-3xl relative transition-transform hover:scale-[1.02] ${
                      msg.sender._id === getUserIdFromToken(user?.token)
                        ? "bg-gradient-to-br from-purple-600 to-blue-500 text-white shadow-lg"
                        : "bg-white text-gray-900 shadow-md"
                    }`}
                  >
                    <div className="absolute -top-2 left-3 w-4 h-4 bg-white transform rotate-45"></div>
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    <div className={`mt-2 flex items-center justify-end space-x-1 ${
                      msg.sender._id === getUserIdFromToken(user?.token) ? 'text-purple-100' : 'text-gray-500'
                    }`}>
                      <span className="text-xs">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-6 bg-white/90 border-t border-gray-100">
              <div className="flex gap-3">
                <button className="p-2 text-gray-500 hover:text-purple-600 transition-colors">
                  <PaperClipIcon className="w-6 h-6" />
                </button>
                <button className="p-2 text-gray-500 hover:text-purple-600 transition-colors">
                  <FaceSmileIcon className="w-6 h-6" />
                </button>
                <input
                  type="text"
                  placeholder="Write a message..."
                  className="flex-1 p-3 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-200 focus:bg-white transition-all"
                  value={newMessage}
                  onChange={handleTyping}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                />
                <button
                  onClick={handleSendMessage}
                  className="p-3 bg-gradient-to-br from-purple-600 to-blue-500 text-white rounded-2xl hover:shadow-lg transition-all"
                >
                  <PaperAirplaneIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-white to-purple-50/50">
            <div className="text-center max-w-md">
              <div className="animate-bounce mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-blue-100 rounded-3xl flex items-center justify-center mx-auto">
                  <UsersIcon className="w-12 h-12 text-purple-600" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome to Chat App
              </h3>
              <p className="text-gray-600 mb-6">
                Select a chat or start a new conversation to begin messaging
              </p>
            </div>
          </div>
        )}
      </div>


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
