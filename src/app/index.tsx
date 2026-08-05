import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../config/firebase";
import { useChat } from "../context/ChatContext";

type Message = {
  id: string;
  text: string;
  sender: "user" | "ai";
  createdAt?: any;
};

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");

  // Puxa as variáveis do Contexto que acabamos de criar
  const { activeSessionId, setActiveSessionId, isDarkMode } = useChat();
  const styles = getChatStyles(isDarkMode);

  useEffect(() => {
    // Se clicou em "Nova Conversa" (null), limpa a tela de mensagens
    if (!activeSessionId) {
      setMessages([]);
      return;
    }

    const messagesRef = collection(
      db,
      "conversations",
      activeSessionId,
      "messages",
    );
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMessages = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      })) as Message[];

      setMessages(loadedMessages);
    });

    return () => unsubscribe();
  }, [activeSessionId]);

  const sendMessage = async () => {
    if (inputText.trim() === "") return;

    const textToSend = inputText;
    setInputText("");

    let currentSessionId = activeSessionId;

    // Se for a PRIMEIRA mensagem de uma nova conversa
    if (!currentSessionId) {
      // Gera um ID novo aleatório para a coleção principal
      const newSessionRef = doc(collection(db, "conversations"));
      currentSessionId = newSessionRef.id;

      // Atualiza o documento pai com dados de telemetria
      await setDoc(newSessionRef, {
        alunoId: "aluno-anonimo",
        ultimaInteracao: serverTimestamp(),
      });

      // Avisa o resto do aplicativo qual é a sessão atual
      setActiveSessionId(currentSessionId);
    } else {
      // Se já existe a conversa, apenas atualiza o "visto por último" para subir no histórico
      const sessionDocRef = doc(db, "conversations", currentSessionId);
      await setDoc(
        sessionDocRef,
        { ultimaInteracao: serverTimestamp() },
        { merge: true },
      );
    }

    const messagesRef = collection(
      db,
      "conversations",
      currentSessionId,
      "messages",
    );

    await addDoc(messagesRef, {
      text: textToSend,
      sender: "user",
      createdAt: serverTimestamp(),
    });

    setTimeout(async () => {
      await addDoc(messagesRef, {
        text: "Analisando a sua dúvida de forma estruturada...",
        sender: "ai",
        createdAt: serverTimestamp(),
      });
    }, 1000);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === "user";
    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.aiBubble,
        ]}
      >
        <Text
          style={[styles.messageText, isUser ? styles.userText : styles.aiText]}
        >
          {item.text}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Mensagem de boas vindas caso seja uma tela de "Nova Conversa" vazia */}
      {!activeSessionId && messages.length === 0 && (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateTitle}>
            Olá! Como posso te guiar hoje?
          </Text>
        </View>
      )}

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Digite sua dúvida..."
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Enviar</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const getChatStyles = (isDarkMode: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: isDarkMode ? "#121212" : "#F0F2F5" },
    emptyStateContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    emptyStateTitle: {
      fontSize: 20,
      color: isDarkMode ? "#666" : "#0056b3",
      fontWeight: "bold",
    },
    messageList: { padding: 16, paddingBottom: 20, flexGrow: 1 },
    messageBubble: {
      maxWidth: "80%",
      padding: 12,
      borderRadius: 16,
      marginBottom: 10,
    },
    userBubble: {
      backgroundColor: isDarkMode ? "#272753" : "#0056b3",
      alignSelf: "flex-end",
      borderBottomRightRadius: 4,
    },
    aiBubble: {
      backgroundColor: isDarkMode ? "#1E1E2D" : "#FFFFFF",
      alignSelf: "flex-start",
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: isDarkMode ? "#333" : "#E0E0E0",
    },
    messageText: { fontSize: 16, lineHeight: 22 },
    userText: { color: "#FFFFFF" },
    aiText: { color: isDarkMode ? "#E0E0E0" : "#333333" },
    inputContainer: {
      flexDirection: "row",
      padding: 12,
      backgroundColor: isDarkMode ? "#1E1E2D" : "#FFFFFF",
      borderTopWidth: 1,
      borderColor: isDarkMode ? "#333" : "#E0E0E0",
      alignItems: "center",
    },
    input: {
      flex: 1,
      backgroundColor: isDarkMode ? "#121212" : "#F0F2F5",
      color: isDarkMode ? "#FFF" : "#333",
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 16,
      marginRight: 10,
    },
    sendButton: {
      backgroundColor: "#272753",
      borderRadius: 20,
      paddingVertical: 10,
      paddingHorizontal: 16,
      justifyContent: "center",
    },
    sendButtonText: { color: "#FFFFFF", fontWeight: "bold" },
  });
