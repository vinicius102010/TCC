import React, { createContext, useContext, useState } from "react";

type ChatContextData = {
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
};

const ChatContext = createContext<ChatContextData>({} as ChatContextData);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Já começamos no modo escuro por padrão!
  const [isDarkMode, setIsDarkMode] = useState(true);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  return (
    <ChatContext.Provider
      value={{ activeSessionId, setActiveSessionId, isDarkMode, toggleTheme }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);
