import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useChat } from "../context/ChatContext";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { isDarkMode } = useChat();
  const styles = getLoginStyles(isDarkMode);

  // Estas funções serão conectadas ao Firebase no próximo passo
  const handleEmailLogin = () => {
    console.log("Tentando logar com:", email, password);
  };

  const handleGoogleLogin = () => {
    console.log("Tentando logar com Google");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Tutor Socrático</Text>
        <Text style={styles.subtitle}>Acesse sua conta para continuar</Text>

        <TextInput
          style={styles.input}
          placeholder="Seu e-mail escolar ou pessoal"
          placeholderTextColor={isDarkMode ? "#888" : "#aaa"}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Sua senha"
          placeholderTextColor={isDarkMode ? "#888" : "#aaa"}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleEmailLogin}
        >
          <Text style={styles.primaryButtonText}>Entrar</Text>
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>OU</Text>
          <View style={styles.divider} />
        </View>

        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleLogin}
        >
          <Text style={styles.googleButtonText}>🌐 Continuar com o Google</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const getLoginStyles = (isDarkMode: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: isDarkMode ? "#121212" : "#F0F2F5",
    },
    card: {
      width: "90%",
      maxWidth: 400,
      backgroundColor: isDarkMode ? "#1E1E2D" : "#FFFFFF",
      padding: 30,
      borderRadius: 16,
      elevation: 5,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      color: isDarkMode ? "#FFFFFF" : "#0056b3",
      textAlign: "center",
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: isDarkMode ? "#888" : "#666",
      textAlign: "center",
      marginBottom: 24,
    },
    input: {
      backgroundColor: isDarkMode ? "#121212" : "#F0F2F5",
      color: isDarkMode ? "#FFF" : "#333",
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDarkMode ? "#333" : "#E0E0E0",
    },
    primaryButton: {
      backgroundColor: "#0056b3",
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: "center",
      marginBottom: 20,
    },
    primaryButtonText: {
      color: "#FFFFFF",
      fontWeight: "bold",
      fontSize: 16,
    },
    dividerContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 20,
    },
    divider: {
      flex: 1,
      height: 1,
      backgroundColor: isDarkMode ? "#333" : "#E0E0E0",
    },
    dividerText: {
      color: isDarkMode ? "#888" : "#aaa",
      paddingHorizontal: 10,
      fontWeight: "bold",
    },
    googleButton: {
      backgroundColor: isDarkMode ? "#272753" : "#FFFFFF",
      borderWidth: isDarkMode ? 0 : 1,
      borderColor: "#E0E0E0",
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: "center",
    },
    googleButtonText: {
      color: isDarkMode ? "#FFFFFF" : "#333333",
      fontWeight: "bold",
      fontSize: 16,
    },
  });
