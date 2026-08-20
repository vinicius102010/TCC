import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
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
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { getTutorResponse } from "../services/aiService";

type Message = {
  id: string;
  text: string;
  sender: "user" | "ai";
  imageUrl?: string; // Suporte para salvar o link/URI da imagem
  createdAt?: any;
};

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // Estado da imagem anexada

  const { activeSessionId, setActiveSessionId, isDarkMode } = useChat();
  const { user } = useAuth();

  const firstName = user?.displayName ? user.displayName.split(" ")[0] : "";
  const styles = getChatStyles(isDarkMode);

  useEffect(() => {
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

  // Função para abrir a galeria de fotos
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const sendMessage = async () => {
    if ((inputText.trim() === "" && !selectedImage) || !user) return;

    const textToSend = inputText;
    const imageToSend = selectedImage;

    // Limpa a interface imediatamente para o usuário
    setInputText("");
    setSelectedImage(null);

    let currentSessionId = activeSessionId;

    if (!currentSessionId) {
      const newSessionRef = doc(collection(db, "conversations"));
      currentSessionId = newSessionRef.id;

      await setDoc(newSessionRef, {
        alunoId: user.uid,
        alunoNome: user.displayName || "Aluno",
        ultimaInteracao: serverTimestamp(),
      });

      setActiveSessionId(currentSessionId);
    } else {
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

    // 1. Salva a mensagem do aluno (com texto e/ou foto)
    await addDoc(messagesRef, {
      text: textToSend,
      imageUrl: imageToSend || null,
      sender: "user",
      createdAt: serverTimestamp(),
    });

    // 2. Busca a resposta da IA
    const promptWithContext = imageToSend
      ? `[O aluno enviou uma imagem/exercício em anexo] ${textToSend}`
      : textToSend;

    const aiResponseText = await getTutorResponse(messages, promptWithContext);

    // 3. Salva a resposta da IA
    await addDoc(messagesRef, {
      text: aiResponseText,
      sender: "ai",
      createdAt: serverTimestamp(),
    });
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
        {item.imageUrl && (
          <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />
        )}
        {item.text !== "" && (
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userText : styles.aiText,
            ]}
          >
            {item.text}
          </Text>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {!activeSessionId && messages.length === 0 && (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateTitle}>
            {firstName ? `Olá, ${firstName}! ` : "Olá! "}Como posso te guiar
            hoje?
          </Text>
        </View>
      )}

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
      />

      {/* Pré-visualização da Imagem selecionada antes de enviar */}
      {selectedImage && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: selectedImage }} style={styles.previewImage} />
          <TouchableOpacity
            style={styles.removeImageButton}
            onPress={() => setSelectedImage(null)}
          >
            <Icon name="close-circle" size={24} color="#FF4D4D" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputContainer}>
        {/* Botão de Anexo/Clipe */}
        <TouchableOpacity style={styles.attachButton} onPress={pickImage}>
          <Icon
            name="paperclip"
            size={22}
            color={isDarkMode ? "#888" : "#666"}
          />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Digite sua dúvida ou anexe uma foto..."
          placeholderTextColor={isDarkMode ? "#888" : "#aaa"}
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
      color: isDarkMode ? "#82B1FF" : "#0056b3",
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
    messageImage: {
      width: 200,
      height: 200,
      borderRadius: 12,
      marginBottom: 8,
    },

    // Painel de Pré-visualização da Foto
    previewContainer: {
      flexDirection: "row",
      alignItems: "center",
      padding: 8,
      backgroundColor: isDarkMode ? "#1E1E2D" : "#FFF",
      borderTopWidth: 1,
      borderColor: isDarkMode ? "#333" : "#E0E0E0",
    },
    previewImage: { width: 60, height: 60, borderRadius: 8, marginRight: 8 },
    removeImageButton: { padding: 4 },

    inputContainer: {
      flexDirection: "row",
      padding: 12,
      backgroundColor: isDarkMode ? "#1E1E2D" : "#FFFFFF",
      borderTopWidth: 1,
      borderColor: isDarkMode ? "#333" : "#E0E0E0",
      alignItems: "center",
    },
    attachButton: { paddingRight: 10, paddingLeft: 4 },
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
