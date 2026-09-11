import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { Slot, useRouter, useSegments } from "expo-router";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
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
  const [isSacVisible, setIsSacVisible] = useState(false);
  const [isHideChatVisible, setIsHideChatVisible] = useState(false);
  const [chatToHide, setChatToHide] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [customAlert, setCustomAlert] = useState({
    visible: false,
    title: "",
    message: "",
  });
  const [sacMessage, setSacMessage] = useState("");
  const [isSendingSac, setIsSendingSac] = useState(false);

  const { activeSessionId, setActiveSessionId, isDarkMode, toggleTheme } =
    useChat();

  // Puxamos a função de logout do AuthContext
  const { user, isLoading, logout } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const styles = getLayoutStyles(isDarkMode);
  const showCustomAlert = (title: string, message: string) => {
    setCustomAlert({ visible: true, title, message });
  };

  useEffect(() => {
    if (isLoading) return;

    const isLoginPage = segments[0] === "login";

    if (!user && !isLoginPage) {
      router.replace("/login");
    } else if (user && isLoginPage) {
      router.replace("/");
    }
  }, [user, isLoading, segments]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "conversations"),
      where("alunoId", "==", user.uid),
      orderBy("ultimaInteracao", "desc"),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((session: any) => !session.hidden); // Filtra as conversas ocultas
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
  const handleOpenHideChat = (id: string, title: string) => {
    setChatToHide({
      id,
      title: title || "Nova Conversa",
    });

    setIsHideChatVisible(true);
  };
  const handleConfirmHideChat = async () => {
    if (!chatToHide) return;

    try {
      const chatRef = doc(db, "conversations", chatToHide.id);

      await updateDoc(chatRef, {
        hidden: true,
      });

      if (activeSessionId === chatToHide.id) {
        setActiveSessionId(null);
      }

      setIsHideChatVisible(false);
      setChatToHide(null);
    } catch (error) {
      console.error("Erro ao excluir conversa:", error);
    }
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
  const handleSendSac = async () => {
    if (sacMessage.trim() === "") {
      showCustomAlert("Atenção", "Digite uma mensagem antes de enviar.");
      return;
    }

    setIsSendingSac(true);

    try {
      const FORMSPREE_ENDPOINT = "https://formspree.io/f/mljergjo";

      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          nomeAluno: user?.displayName || "Aluno sem nome",
          emailAluno: user?.email || "Sem email",
          mensagem: sacMessage,
        }),
      });

      if (response.ok) {
        showCustomAlert(
          "Sucesso!",
          "Sua mensagem foi enviada. Responderemos em breve no seu e-mail.",
        );
        setIsSacVisible(false);
        setSacMessage("");
      } else {
        throw new Error("Falha na requisição");
      }
    } catch (error) {
      showCustomAlert(
        "Erro",
        "Não foi possível enviar a mensagem. Tente novamente mais tarde.",
      );
    } finally {
      setIsSendingSac(false);
    }
  };

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
              <View
                style={[
                  styles.historyItem,
                  activeSessionId === item.id && styles.historyItemActive,
                ]}
              >
                <TouchableOpacity
                  style={styles.historyItemContent}
                  onPress={() => handleSelectChat(item.id)}
                >
                  <Text style={styles.historyItemText} numberOfLines={1}>
                    {item.titulo || "Nova Conversa"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.hideChatButton}
                  onPress={() =>
                    handleOpenHideChat(item.id, item.titulo || "Nova Conversa")
                  }
                >
                  <Icon
                    name="trash-can-outline"
                    size={20}
                    color={isDarkMode ? "#888" : "#A0A0A0"}
                  />
                </TouchableOpacity>
              </View>
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
          <TouchableOpacity
            style={styles.sacButton}
            onPress={() => setIsSacVisible(true)}
          >
            <Text style={styles.sacButtonText}>Precisa de ajuda? SAC</Text>
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
            <Text style={styles.headerTitle}>Lume</Text>
          </View>

          <TouchableOpacity onPress={toggleTheme} style={styles.themeButton}>
            <Text style={styles.themeIcon}>{isDarkMode ? "☀️" : "🌙"}</Text>
          </TouchableOpacity>
        </View>
        <Slot />
      </View>
      <Modal
        visible={isHideChatVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setIsHideChatVisible(false);
          setChatToHide(null);
        }}
      >
        <View style={styles.hideChatOverlay}>
          <View style={styles.hideChatContainer}>
            <Text style={styles.hideChatTitle}>Excluir conversa</Text>

            <Text style={styles.hideChatMessage}>
              Tem certeza que deseja excluir a conversa{" "}
              <Text style={styles.hideChatChatName}>"{chatToHide?.title}"</Text>
              ?
            </Text>

            <View style={styles.hideChatButtons}>
              <TouchableOpacity
                style={styles.hideChatCancelButton}
                onPress={() => {
                  setIsHideChatVisible(false);
                  setChatToHide(null);
                }}
              >
                <Text style={styles.hideChatCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.hideChatConfirmButton}
                onPress={handleConfirmHideChat}
              >
                <Text style={styles.hideChatConfirmText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={isSacVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsSacVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Fale com o Suporte</Text>
            <Text style={styles.modalSubtitle}>
              Encontrou um erro ou tem alguma sugestão para melhorar o Lume?
              Mande para a gente!
            </Text>

            <TextInput
              style={styles.sacInput}
              placeholder="Digite sua mensagem aqui..."
              placeholderTextColor="#888"
              multiline
              numberOfLines={5}
              value={sacMessage}
              onChangeText={setSacMessage}
              textAlignVertical="top" // Para alinhar o texto no topo da caixa
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setIsSacVisible(false);
                  setSacMessage("");
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sendSacButton}
                onPress={handleSendSac}
                disabled={isSendingSac}
              >
                <Text style={styles.sendSacButtonText}>
                  {isSendingSac ? "Enviando..." : "Enviar Mensagem"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={customAlert.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() =>
          setCustomAlert({
            ...customAlert,
            visible: false,
          })
        }
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>{customAlert.title}</Text>

            <Text style={styles.alertMessage}>{customAlert.message}</Text>

            <TouchableOpacity
              style={styles.alertButton}
              onPress={() =>
                setCustomAlert({
                  ...customAlert,
                  visible: false,
                })
              }
            >
              <Text style={styles.alertButtonText}>OK, entendi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    historyItem: {
      borderRadius: 8,
      marginBottom: 4,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
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
    sacButton: {
      marginTop: 15,
      padding: 12,
      backgroundColor: "rgba(255,255,255,0.1)",
      borderRadius: 8,
      alignItems: "center",
    },
    sacButtonText: { color: "#82B1FF", fontWeight: "bold" },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    modalContainer: {
      width: "100%",
      maxWidth: 450,
      backgroundColor: "#1E1E2D",
      borderRadius: 16,
      padding: 24,
      elevation: 5,
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: "bold",
      color: "#FFF",
      marginBottom: 8,
    },
    modalSubtitle: {
      fontSize: 14,
      color: "#AAA",
      marginBottom: 20,
      lineHeight: 20,
    },
    sacInput: {
      backgroundColor: "#121212",
      color: "#FFF",
      borderRadius: 8,
      padding: 16,
      fontSize: 16,
      minHeight: 120,
      borderWidth: 1,
      borderColor: "#333",
      marginBottom: 20,
    },
    modalButtons: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
    cancelButton: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
    },
    cancelButtonText: { color: "#FF4D4D", fontWeight: "bold", fontSize: 16 },
    sendSacButton: {
      backgroundColor: "#0056b3",
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
      justifyContent: "center",
    },
    sendSacButtonText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },

    historyItemContent: {
      flex: 1,
      padding: 12,
    },

    hideChatButton: {
      padding: 12,
    },

    hideChatOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },

    hideChatContainer: {
      width: "100%",
      maxWidth: 450,
      backgroundColor: isDarkMode ? "#1E1E2D" : "#FFFFFF",
      borderRadius: 16,
      padding: 24,
      elevation: 5,
    },

    hideChatTitle: {
      fontSize: 22,
      fontWeight: "bold",
      color: isDarkMode ? "#FFFFFF" : "#222222",
      marginBottom: 12,
    },

    hideChatMessage: {
      fontSize: 15,
      color: isDarkMode ? "#AAAAAA" : "#555555",
      lineHeight: 22,
      marginBottom: 24,
    },

    hideChatChatName: {
      fontWeight: "bold",
      color: isDarkMode ? "#FFFFFF" : "#222222",
    },

    hideChatButtons: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 12,
    },

    hideChatCancelButton: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
    },

    hideChatCancelText: {
      color: "#FF4D4D",
      fontWeight: "bold",
      fontSize: 16,
    },

    hideChatConfirmButton: {
      backgroundColor: "#0056b3",
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
    },

    hideChatConfirmText: {
      color: "#FFFFFF",
      fontWeight: "bold",
      fontSize: 16,
    },
    alertOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.7)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },

    alertBox: {
      width: "100%",
      maxWidth: 350,
      backgroundColor: "#1E1E2D",
      borderRadius: 16,
      padding: 24,
      alignItems: "center",
      elevation: 5,
    },

    alertTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: "#FFF",
      marginBottom: 12,
      textAlign: "center",
    },

    alertMessage: {
      fontSize: 15,
      color: "#AAA",
      textAlign: "center",
      marginBottom: 24,
      lineHeight: 22,
    },

    alertButton: {
      backgroundColor: "#0056b3",
      width: "100%",
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: "center",
    },

    alertButtonText: {
      color: "#FFF",
      fontWeight: "bold",
      fontSize: 16,
    },
  });
