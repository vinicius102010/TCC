import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { Slot, useRouter, useSegments } from "expo-router";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { db } from "../config/firebase";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { ChatProvider, useChat } from "../context/ChatContext";

function MainLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(Platform.OS === "web");
  const [conversations, setConversations] = useState<any[]>([]);

  const { activeSessionId, setActiveSessionId, isDarkMode, toggleTheme } =
    useChat();

  // Puxamos a função de logout do AuthContext
  const { user, isLoading, logout } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const styles = getLayoutStyles(isDarkMode);

  // PROTEÇÃO DE ROTAS
  useEffect(() => {
    if (isLoading) return;

    const isLoginPage = segments[0] === "login";

    if (!user && !isLoginPage) {
      router.replace("/login");
    } else if (user && isLoginPage) {
      router.replace("/");
    }
  }, [user, isLoading, segments]);

  // Histórico de conversas
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "conversations"),
      orderBy("ultimaInteracao", "desc"),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setConversations(sessions);
    });
    return () => unsubscribe();
  }, [user]);

  const handleNewChat = () => {
    setActiveSessionId(null);
    if (Platform.OS !== "web") setIsMenuOpen(false);
  };

  const handleSelectChat = (id: string) => {
    setActiveSessionId(id);
    if (Platform.OS !== "web") setIsMenuOpen(false);
  };

  const isLoginPage = segments[0] === "login";

  if (isLoginPage) {
    return <Slot />;
  }

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <Text style={{ color: isDarkMode ? "#FFF" : "#333" }}>
          Verificando credenciais...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isMenuOpen && (
        <View style={styles.sidebar}>
          <TouchableOpacity
            style={styles.newChatButton}
            onPress={handleNewChat}
          >
            <Text style={styles.newChatText}>+ Nova Conversa</Text>
          </TouchableOpacity>

          <Text style={styles.historyTitle}>Histórico</Text>
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.historyItem,
                  activeSessionId === item.id && styles.historyItemActive,
                ]}
                onPress={() => handleSelectChat(item.id)}
              >
                <Text style={styles.historyItemText} numberOfLines={1}>
                  Conversa: {item.id.substring(0, 5)}...
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.historyPlaceholder}>
                Nenhuma conversa ainda.
              </Text>
            }
          />

          {/* BOTÃO DE SAIR NO RODAPÉ DO MENU */}
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Icon
              name="logout"
              size={20}
              color="#FF4D4D"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.logoutButtonText}>Sair da Conta</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.mainContent}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => setIsMenuOpen(!isMenuOpen)}
              style={styles.menuButton}
            >
              <Text style={styles.menuIcon}>☰</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Tutor Socrático</Text>
          </View>

          <TouchableOpacity onPress={toggleTheme} style={styles.themeButton}>
            <Text style={styles.themeIcon}>{isDarkMode ? "☀️" : "🌙"}</Text>
          </TouchableOpacity>
        </View>
        <Slot />
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ChatProvider>
          <MainLayout />
        </ChatProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const getLayoutStyles = (isDarkMode: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: "row",
      backgroundColor: isDarkMode ? "#121212" : "#F0F2F5",
    },
    sidebar: {
      width: 260,
      backgroundColor: isDarkMode ? "#1E1E2D" : "#0056b3",
      padding: 16,
      borderRightWidth: 1,
      borderColor: isDarkMode ? "#333" : "#004494",
      justifyContent: "space-between",
    },
    newChatButton: {
      backgroundColor: "#272753",
      padding: 12,
      borderRadius: 8,
      alignItems: "center",
      marginBottom: 20,
    },
    newChatText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
    historyTitle: {
      color: isDarkMode ? "#888" : "#ffffff",
      fontSize: 12,
      fontWeight: "bold",
      marginBottom: 10,
      textTransform: "uppercase",
    },
    historyItem: { padding: 12, borderRadius: 8, marginBottom: 4 },
    historyItemActive: { backgroundColor: "#272753" },
    historyItemText: { color: "#ffffff", fontSize: 14 },
    historyPlaceholder: {
      color: "#888",
      fontStyle: "italic",
      textAlign: "center",
      marginTop: 20,
    },
    logoutButton: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      borderRadius: 8,
      marginTop: 10,
      borderTopWidth: 1,
      borderColor: isDarkMode ? "#333" : "#004494",
    },
    logoutButtonText: { color: "#FF4D4D", fontWeight: "bold", fontSize: 14 },
    mainContent: { flex: 1, flexDirection: "column" },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: isDarkMode ? "#1E1E2D" : "#0056b3",
      padding: 16,
      elevation: 3,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      zIndex: 10,
    },
    headerLeft: { flexDirection: "row", alignItems: "center" },
    menuButton: { marginRight: 16, padding: 4 },
    menuIcon: { color: "#FFF", fontSize: 24, fontWeight: "bold" },
    headerTitle: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
    themeButton: {
      padding: 8,
      backgroundColor: isDarkMode ? "#333" : "#004494",
      borderRadius: 20,
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    themeIcon: { fontSize: 16 },
  });
