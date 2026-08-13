import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth } from "../config/firebase";
import { useChat } from "../context/ChatContext";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState(""); // Novo estado para confirmação
  const [showPassword, setShowPassword] = useState(false);

  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const { isDarkMode } = useChat();
  const styles = getLoginStyles(isDarkMode);

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert("Atenção", "Por favor, preencha o e-mail e a senha.");
      return;
    }

    if (isCreatingAccount) {
      if (password !== confirmPassword) {
        Alert.alert("Atenção", "As senhas não coincidem. Digite novamente.");
        return;
      }

      try {
        await createUserWithEmailAndPassword(auth, email, password);
      } catch (error: any) {
        console.error(error);
        Alert.alert(
          "Erro ao criar conta",
          "Verifique os dados, se a senha tem no mínimo 6 caracteres, ou se o e-mail já está em uso.",
        );
      }
    } else {
      // FLUXO DE LOGIN ATUALIZADO
      try {
        await signInWithEmailAndPassword(auth, email, password);
        // Se a senha estiver correta, o Firebase atualiza o estado e
        // o nosso AuthContext joga o usuário automaticamente para o Chat!
      } catch (error: any) {
        console.error(error);
        Alert.alert(
          "Erro ao entrar",
          "E-mail ou senha incorretos. Verifique seus dados e tente novamente.",
        );
      }
    }
  };

  // Função para limpar os campos ao alternar entre Login e Cadastro
  const toggleMode = () => {
    setIsCreatingAccount(!isCreatingAccount);
    setConfirmPassword(""); // Limpa a confirmação de senha por segurança
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
        <Text style={styles.subtitle}>
          {isCreatingAccount
            ? "Crie sua conta para começar"
            : "Acesse sua conta para continuar"}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Seu e-mail escolar ou pessoal"
          placeholderTextColor={isDarkMode ? "#888" : "#aaa"}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Sua senha"
            placeholderTextColor={isDarkMode ? "#888" : "#aaa"}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Icon
              name={showPassword ? "eye-off" : "eye"}
              size={24}
              color={isDarkMode ? "#888" : "#aaa"}
            />
          </TouchableOpacity>
        </View>

        {/* CAMPO CONDICIONAL: Só renderiza se estiver criando conta */}
        {isCreatingAccount && (
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Confirme sua senha"
              placeholderTextColor={isDarkMode ? "#888" : "#aaa"}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
            />
          </View>
        )}

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleEmailAuth}
        >
          <Text style={styles.primaryButtonText}>
            {isCreatingAccount ? "Cadastrar" : "Entrar"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.switchModeButton} onPress={toggleMode}>
          <Text style={styles.switchModeText}>
            {isCreatingAccount
              ? "Já tem uma conta? Clique aqui para entrar."
              : "Não tem uma conta? Crie uma aqui."}
          </Text>
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
          <Icon
            name="google"
            size={20}
            color={isDarkMode ? "#FFF" : "#db4a39"}
            style={styles.googleIcon}
          />
          <Text style={styles.googleButtonText}>Continuar com o Google</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// Os estilos continuam os mesmos
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
    passwordContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDarkMode ? "#121212" : "#F0F2F5",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDarkMode ? "#333" : "#E0E0E0",
      marginBottom: 16,
    },
    passwordInput: {
      flex: 1,
      color: isDarkMode ? "#FFF" : "#333",
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
    },
    eyeIcon: { padding: 12 },
    primaryButton: {
      backgroundColor: "#0056b3",
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: "center",
      marginBottom: 16,
    },
    primaryButtonText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 16 },
    switchModeButton: { alignItems: "center", marginBottom: 24 },
    switchModeText: { color: "#0056b3", fontWeight: "600", fontSize: 14 },
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
      flexDirection: "row",
      backgroundColor: isDarkMode ? "#272753" : "#FFFFFF",
      borderWidth: isDarkMode ? 0 : 1,
      borderColor: "#E0E0E0",
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    googleIcon: { marginRight: 10 },
    googleButtonText: {
      color: isDarkMode ? "#FFFFFF" : "#333333",
      fontWeight: "bold",
      fontSize: 16,
    },
  });
