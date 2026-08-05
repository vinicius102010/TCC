import { Slot } from "expo-router";
import { useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  // No computador (web), o menu já começa aberto. No celular, começa fechado.
  const [isMenuOpen, setIsMenuOpen] = useState(Platform.OS === "web");

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* MENU LATERAL (SIDEBAR) */}
        {isMenuOpen && (
          <View style={styles.sidebar}>
            <TouchableOpacity style={styles.newChatButton}>
              <Text style={styles.newChatText}>+ Nova Conversa</Text>
            </TouchableOpacity>

            {/* O histórico de conversas do Firestore será listado aqui no futuro */}
            <Text style={styles.historyPlaceholder}>Histórico vazio...</Text>
          </View>
        )}

        {/* ÁREA PRINCIPAL (CHAT) */}
        <View style={styles.mainContent}>
          {/* Cabeçalho Customizado */}
          <View style={styles.header}>
            <TouchableOpacity onPress={toggleMenu} style={styles.menuButton}>
              {/* Ícone simples de Hambúrguer */}
              <Text style={styles.menuIcon}>☰</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Tutor Socrático</Text>
          </View>

          {/* O Slot é onde o Expo injeta a sua tela atual (o seu index.tsx) */}
          <Slot />
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row", // É isso que coloca o menu e o chat lado a lado
    backgroundColor: "#F0F2F5",
  },
  sidebar: {
    width: 260,
    backgroundColor: "#0056b3", // Cor escura para contrastar com o chat
    padding: 16,
    borderRightWidth: 1,
    borderColor: "#333",
  },
  newChatButton: {
    backgroundColor: "#3A3A4C",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  newChatText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  historyPlaceholder: {
    color: "#888",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 20,
  },
  mainContent: {
    flex: 1,
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0056b3",
    padding: 16,
    elevation: 3, // Sombra no Android
    shadowColor: "#000", // Sombra na Web/iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 10,
  },
  menuButton: {
    marginRight: 16,
    padding: 4,
  },
  menuIcon: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "bold",
  },
  headerTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
});
