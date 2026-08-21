import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Head from "expo-router/head";
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
import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { getTutorResponse } from "../services/aiService";

type Message = {
  id: string;
  text: string;
  sender: "user" | "ai";
  imageUrl?: string;
  createdAt?: any;
};

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");

  // Estados da Imagem
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // URI para mostrar na tela
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(
    null,
  ); // Dados reais para a IA
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null); // Imagem em tela cheia

  const { activeSessionId, setActiveSessionId, isDarkMode } = useChat();
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  const firstName = user?.displayName ? user.displayName.split(" ")[0] : "";
  const styles = getChatStyles(isDarkMode);

  // 1. CARREGAR HISTÓRICO
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

  // 2. FUNÇÃO DE COLAR (CTRL+V) PARA A WEB
  useEffect(() => {
    if (Platform.OS !== "web") return;

    // Escuta tudo que é colado no navegador
    const handlePaste = (e: any) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        // Verifica se o que foi colado é uma imagem
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            // Cria um link temporário para mostrar a miniatura na tela
            const uri = URL.createObjectURL(blob);
            setSelectedImage(uri);

            // Converte a imagem colada para Base64 para enviar à IA
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64String = reader.result as string;
              // Separa apenas os dados da imagem, tirando o cabeçalho
              const base64Data = base64String.split(",")[1];
              setSelectedImageBase64(base64Data);
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  // 3. FUNÇÃO DO BOTÃO DE CLIPE (ANEXAR)
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // Correção de tipo
      allowsEditing: true,
      quality: 0.8,
      base64: true, // SOLUÇÃO: Pede para a biblioteca já entregar o Base64 pronto!
    });

    if (!result.canceled && result.assets[0].uri) {
      setSelectedImage(result.assets[0].uri);
      setSelectedImageBase64(result.assets[0].base64 || null); // Salva o Base64 direto
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setSelectedImageBase64(null);
  };

  // 4. FUNÇÃO DE ENVIAR MENSAGEM
  const sendMessage = async () => {
    if ((inputText.trim() === "" && !selectedImage) || !user) return;

    const textToSend = inputText;
    // Não vamos mais usar o selectedImage (blob) para salvar no banco!
    const imageToSendBase64 = selectedImageBase64;

    setInputText("");
    removeImage(); // Limpa a UI

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

    // MÁGICA AQUI: Criamos uma URI de dados permanente usando o Base64
    let permanentImageUrl = null;
    if (imageToSendBase64) {
      permanentImageUrl = `data:image/jpeg;base64,${imageToSendBase64}`;
    }

    await addDoc(messagesRef, {
      text: textToSend,
      imageUrl: permanentImageUrl, // Salva o Base64 embutido, e não o link temporário
      sender: "user",
      createdAt: serverTimestamp(),
    });

    const aiResponseText = await getTutorResponse(
      messages,
      textToSend,
      imageToSendBase64,
    );

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
          <TouchableOpacity onPress={() => setViewingImageUrl(item.imageUrl!)}>
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.messageImage}
            />
          </TouchableOpacity>
        )}

        {item.text !== "" &&
          (isUser ? (
            <Text style={[styles.messageText, styles.userText]}>
              {item.text}
            </Text>
          ) : (
            <View style={{ flex: 1, overflow: "hidden" }}>
              {Platform.OS === "web" ? (
                /* Na Web, usamos o ecossistema padrão de HTML/CSS para renderizar LaTeX */
                <div
                  style={{
                    color: isDarkMode ? "#E0E0E0" : "#333333",
                    fontSize: "16px",
                    lineHeight: "1.5",
                    fontFamily: "System-ui, -apple-system, sans-serif",
                  }}
                >
                  <Markdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {item.text}
                  </Markdown>
                </div>
              ) : (
                /* Fallback de segurança se abrir no celular */
                <Text style={[styles.messageText, styles.aiText]}>
                  {item.text}
                </Text>
              )}
            </View>
          ))}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css"
        />
      </Head>
      {!activeSessionId && messages.length === 0 && (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateTitle}>
            {firstName ? `Olá, ${firstName}! ` : "Olá! "}Como posso te guiar
            hoje?
          </Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        // ESSAS DUAS LINHAS FAZEM A MÁGICA DE DESCER A TELA
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* PRÉ-VISUALIZAÇÃO (Antes de Enviar) */}
      {selectedImage && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: selectedImage }} style={styles.previewImage} />
          <TouchableOpacity
            style={styles.removeImageButton}
            onPress={removeImage}
          >
            <Icon name="close-circle" size={24} color="#FF4D4D" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.attachButton} onPress={pickImage}>
          <Icon
            name="paperclip"
            size={22}
            color={isDarkMode ? "#888" : "#666"}
          />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Digite sua dúvida, anexe ou cole (Ctrl+V) uma foto..."
          placeholderTextColor={isDarkMode ? "#888" : "#aaa"}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Enviar</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL FULLSCREEN (Para clicar e ampliar as fotos do chat) */}
      <Modal
        visible={viewingImageUrl !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setViewingImageUrl(null)}
      >
        <TouchableOpacity
          style={styles.fullscreenContainer}
          onPress={() => setViewingImageUrl(null)}
        >
          {viewingImageUrl && (
            <Image
              source={{ uri: viewingImageUrl }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
          <TouchableOpacity
            style={styles.closeFullscreenButton}
            onPress={() => setViewingImageUrl(null)}
          >
            <Icon name="close" size={30} color="#FFF" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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

    // Estilos do Modal Fullscreen
    fullscreenContainer: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.9)",
      justifyContent: "center",
      alignItems: "center",
    },
    fullscreenImage: { width: "90%", height: "90%" },
    closeFullscreenButton: {
      position: "absolute",
      top: 50,
      right: 20,
      backgroundColor: "rgba(255,255,255,0.2)",
      borderRadius: 20,
      padding: 8,
    },
  });
