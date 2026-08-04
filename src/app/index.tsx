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

type Message = {
  id: string;
  text: string;
  sender: "user" | "ai";
  createdAt?: any;
};

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");

  // Simulando um ID de sessão.
  // No futuro, quando houver login, isso será gerado dinamicamente para cada aluno/conversa.
  const sessionId = "sessao-teste-001";

  // Busca as mensagens na subcoleção específica desta sessão
  useEffect(() => {
    const messagesRef = collection(db, "conversations", sessionId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMessages = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      })) as Message[];

      setMessages(loadedMessages);
    });

    return () => unsubscribe();
  }, [sessionId]);

  const sendMessage = async () => {
    if (inputText.trim() === "") return;

    const textToSend = inputText;
    setInputText("");

    // Referência para o documento pai (a conversa em si) e para a subcoleção (as mensagens)
    const sessionDocRef = doc(db, "conversations", sessionId);
    const messagesRef = collection(db, "conversations", sessionId, "messages");

    // Garante que o documento da conversa existe para armazenar metadados (útil para a telemetria do TCC)
    await setDoc(
      sessionDocRef,
      {
        alunoId: "aluno-anonimo",
        ultimaInteracao: serverTimestamp(),
      },
      { merge: true },
    );

    // Salva a mensagem do usuário na subcoleção
    await addDoc(messagesRef, {
      text: textToSend,
      sender: "user",
      createdAt: serverTimestamp(),
    });

    // Simula a resposta socrática da IA sendo salva após 1 segundo
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tutor de Matemática</Text>
      </View>

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F2F5" },
  header: { padding: 20, backgroundColor: "#0056b3", alignItems: "center" },
  headerTitle: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
  messageList: { padding: 16, paddingBottom: 20 },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
  },
  userBubble: {
    backgroundColor: "#0056b3",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  messageText: { fontSize: 16, lineHeight: 22 },
  userText: { color: "#FFFFFF" },
  aiText: { color: "#333333" },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#F0F2F5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: "#0056b3",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  sendButtonText: { color: "#FFFFFF", fontWeight: "bold" },
});
