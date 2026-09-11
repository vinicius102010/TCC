import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
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
  updateDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { db, storage } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import {
  generateChatTitle,
  getTutorResponse,
  PdfFileData,
} from "../services/aiService";

type Message = {
  id: string;
  text: string;
  sender: "user" | "ai";
  imageUrl?: string;
  createdAt?: any;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
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
  const [selectedPdf, setSelectedPdf] = useState<PdfFileData | null>(null);
  const { activeSessionId, setActiveSessionId, isDarkMode } = useChat();
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

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
  const pickPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];

      const MAX_FILE_SIZE = 20 * 1024 * 1024;

      if (asset.size && asset.size > MAX_FILE_SIZE) {
        console.warn("PDF maior que 20 MB.");
        return;
      }

      const pdfData: PdfFileData = {
        uri: asset.uri,
        name: asset.name || "documento.pdf",
        mimeType: asset.mimeType || "application/pdf",
        size: asset.size,
        webFile: Platform.OS === "web" ? asset.file : undefined,
      };

      setSelectedPdf(pdfData);
    } catch (error) {
      console.error("Erro ao selecionar PDF:", error);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setSelectedImageBase64(null);
  };
  const removePdf = () => {
    setSelectedPdf(null);
  };

  const uploadPdfToStorage = async (
    pdfFile: PdfFileData,
    conversationId: string,
    messageId: string,
  ) => {
    let blob: Blob;

    if (pdfFile.webFile) {
      blob = pdfFile.webFile;
    } else {
      const response = await fetch(pdfFile.uri);
      blob = await response.blob();
    }

    const storagePath = `conversations/${conversationId}/files/${messageId}.pdf`;

    const storageRef = ref(storage, storagePath);

    await uploadBytes(storageRef, blob, {
      contentType: "application/pdf",
      customMetadata: {
        originalName: pdfFile.name,
      },
    });

    const downloadUrl = await getDownloadURL(storageRef);

    return downloadUrl;
  };
  // 4. FUNÇÃO DE ENVIAR MENSAGEM
  const sendMessage = async () => {
    if ((inputText.trim() === "" && !selectedImage && !selectedPdf) || !user) {
      return;
    }

    const textToSend = inputText;
    const imageToSendBase64 = selectedImageBase64;
    const pdfToSend = selectedPdf;

    setInputText("");
    removeImage();
    removePdf();

    let currentSessionId = activeSessionId;
    let isFirstInteraction = false;

    if (!currentSessionId) {
      isFirstInteraction = true;

      const newSessionRef = doc(collection(db, "conversations"));

      currentSessionId = newSessionRef.id;

      await setDoc(newSessionRef, {
        alunoId: user.uid,
        alunoNome: user.displayName || "Aluno",
        titulo: "Nova Conversa...",
        ultimaInteracao: serverTimestamp(),
      });

      setActiveSessionId(currentSessionId);
    } else {
      const sessionDocRef = doc(db, "conversations", currentSessionId);

      await setDoc(
        sessionDocRef,
        {
          ultimaInteracao: serverTimestamp(),
        },
        {
          merge: true,
        },
      );
    }

    const messagesRef = collection(
      db,
      "conversations",
      currentSessionId,
      "messages",
    );

    const userMessageRef = doc(messagesRef);

    let permanentImageUrl: string | null = null;

    if (imageToSendBase64) {
      permanentImageUrl = `data:image/jpeg;base64,${imageToSendBase64}`;
    }

    let permanentPdfUrl: string | null = null;

    if (pdfToSend) {
      permanentPdfUrl = await uploadPdfToStorage(
        pdfToSend,
        currentSessionId,
        userMessageRef.id,
      );
    }

    await setDoc(userMessageRef, {
      text: textToSend,

      imageUrl: permanentImageUrl,

      fileUrl: permanentPdfUrl,
      fileName: pdfToSend?.name || null,
      fileType: pdfToSend?.mimeType || null,
      fileSize: pdfToSend?.size || null,

      sender: "user",
      createdAt: serverTimestamp(),
    });

    const aiResponseText = await getTutorResponse(
      messages,
      textToSend,
      imageToSendBase64,
      pdfToSend,
    );

    await addDoc(messagesRef, {
      text: aiResponseText,
      sender: "ai",
      createdAt: serverTimestamp(),
    });

    if (isFirstInteraction) {
      generateChatTitle(textToSend, aiResponseText).then(async (newTitle) => {
        const sessionDocRef = doc(db, "conversations", currentSessionId!);

        await updateDoc(sessionDocRef, {
          titulo: newTitle,
        });
      });
    }
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
        {item.fileUrl && (
          <TouchableOpacity
            style={styles.fileAttachment}
            onPress={() => {
              if (Platform.OS === "web") {
                window.open(item.fileUrl, "_blank");
              }
            }}
          >
            <Icon
              name="file-pdf-box"
              size={38}
              color={isUser ? "#FFFFFF" : "#D32F2F"}
            />

            <View style={styles.fileInfo}>
              <Text
                style={[
                  styles.fileName,
                  isUser ? styles.userText : styles.aiText,
                ]}
                numberOfLines={2}
              >
                {item.fileName || "Documento PDF"}
              </Text>

              {item.fileSize && (
                <Text
                  style={[
                    styles.fileSize,
                    isUser ? { color: "#DDE7FF" } : styles.aiText,
                  ]}
                >
                  {(item.fileSize / 1024 / 1024).toFixed(2)} MB
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )}
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
      {selectedPdf && (
        <View style={styles.previewContainer}>
          <Icon name="file-pdf-box" size={40} color="#D32F2F" />

          <View style={styles.pdfPreviewInfo}>
            <Text
              style={[
                styles.pdfPreviewName,
                {
                  color: isDarkMode ? "#FFFFFF" : "#333333",
                },
              ]}
              numberOfLines={1}
            >
              {selectedPdf.name}
            </Text>

            {selectedPdf.size && (
              <Text
                style={[
                  styles.pdfPreviewSize,
                  {
                    color: isDarkMode ? "#AAAAAA" : "#777777",
                  },
                ]}
              >
                {(selectedPdf.size / 1024 / 1024).toFixed(2)} MB
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.removeImageButton}
            onPress={removePdf}
          >
            <Icon name="close-circle" size={24} color="#FF4D4D" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.attachButton}
          onPress={() => setShowAttachmentMenu(true)}
        >
          <Icon
            name="paperclip"
            size={22}
            color={isDarkMode ? "#888" : "#666"}
          />
        </TouchableOpacity>
        <Modal
          visible={showAttachmentMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAttachmentMenu(false)}
        >
          <Pressable
            style={styles.attachmentModalOverlay}
            onPress={() => setShowAttachmentMenu(false)}
          >
            <Pressable
              style={styles.attachmentMenu}
              onPress={(event) => event.stopPropagation()}
            >
              <Text style={styles.attachmentMenuTitle}>Adicionar anexo</Text>

              <TouchableOpacity
                style={styles.attachmentOption}
                onPress={() => {
                  setShowAttachmentMenu(false);
                  pickImage();
                }}
              >
                <View style={styles.attachmentIconContainer}>
                  <Icon name="image-outline" size={24} color="#555" />
                </View>

                <View style={styles.attachmentOptionText}>
                  <Text style={styles.attachmentOptionTitle}>Imagem</Text>

                  <Text style={styles.attachmentOptionDescription}>
                    Enviar uma imagem para o tutor
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.attachmentOption}
                onPress={() => {
                  setShowAttachmentMenu(false);
                  pickPdf();
                }}
              >
                <View style={styles.attachmentIconContainer}>
                  <Icon name="file-document-outline" size={24} color="#555" />
                </View>

                <View style={styles.attachmentOptionText}>
                  <Text style={styles.attachmentOptionTitle}>Arquivo PDF</Text>

                  <Text style={styles.attachmentOptionDescription}>
                    Enviar um arquivo PDF
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.attachmentCancel}
                onPress={() => setShowAttachmentMenu(false)}
              >
                <Text style={styles.attachmentCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        <TextInput
          style={styles.input}
          placeholder="Digite sua dúvida, anexe ou cole um arquivo..."
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
    fileAttachment: {
      flexDirection: "row",
      alignItems: "center",
      padding: 10,
      borderRadius: 10,
      marginBottom: 8,
      backgroundColor: "rgba(0,0,0,0.08)",
      minWidth: 220,
    },

    fileInfo: {
      flex: 1,
      marginLeft: 8,
    },

    fileName: {
      fontSize: 14,
      fontWeight: "600",
    },

    fileSize: {
      fontSize: 12,
      marginTop: 3,
    },

    pdfPreviewInfo: {
      flex: 1,
      marginHorizontal: 8,
    },

    pdfPreviewName: {
      fontSize: 14,
      fontWeight: "600",
    },

    pdfPreviewSize: {
      fontSize: 12,
      marginTop: 2,
    },
    attachmentModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.4)",
      justifyContent: "flex-end",
    },

    attachmentMenu: {
      backgroundColor: "#fff",
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 30,
    },

    attachmentMenuTitle: {
      fontSize: 18,
      fontWeight: "600",
      marginBottom: 15,
      color: "#222",
    },

    attachmentOption: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: "#eee",
    },

    attachmentIconContainer: {
      width: 45,
      height: 45,
      borderRadius: 12,
      backgroundColor: "#f2f2f2",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },

    attachmentOptionText: {
      flex: 1,
    },

    attachmentOptionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: "#222",
    },

    attachmentOptionDescription: {
      fontSize: 13,
      color: "#777",
      marginTop: 3,
    },

    attachmentCancel: {
      marginTop: 15,
      alignItems: "center",
      paddingVertical: 12,
    },

    attachmentCancelText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#555",
    },
  });
