import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Nossos estados de navegação da tela
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false); // NOVO ESTADO

  const { isDarkMode } = useChat();
  const styles = getLoginStyles(isDarkMode);
  const [customAlert, setCustomAlert] = useState({
    visible: false,
    title: "",
    message: "",
  });

  const showCustomAlert = (title: string, message: string) => {
    setCustomAlert({ visible: true, title, message });
  };

  const handleEmailAuth = async () => {
    if (isCreatingAccount && !name.trim()) {
      showCustomAlert(
        "Atenção",
        "Por favor, informe como você gostaria de ser chamado.",
      );
      return;
    }

    if (!email || !password) {
      showCustomAlert("Atenção", "Por favor, preencha o e-mail e a senha.");
      return;
    }

    if (isCreatingAccount) {
      if (password !== confirmPassword) {
        showCustomAlert(
          "Atenção",
          "As senhas não coincidem. Digite novamente.",
        );
        return;
      }

      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        await updateProfile(userCredential.user, { displayName: name });
      } catch (error: any) {
        showCustomAlert(
          "Erro ao criar conta",
          "Verifique os dados, se a senha tem no mínimo 6 caracteres, ou se o e-mail já está em uso.",
        );
      }
    } else {
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (error: any) {
        console.log(error);
        showCustomAlert(
          "Erro ao entrar",
          "E-mail ou senha incorretos. Verifique seus dados e tente novamente.",
        );
      }
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      showCustomAlert(
        "Atenção",
        "Por favor, digite seu e-mail para receber o link.",
      );
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      showCustomAlert(
        "E-mail enviado!",
        "Verifique sua caixa de entrada (e a pasta de spam) para redefinir sua senha.",
      );
      setIsForgotPassword(false); // Volta para a tela de login após enviar com sucesso
    } catch (error: any) {
      console.log(error);
      showCustomAlert(
        "Erro",
        "Não foi possível enviar o e-mail. Verifique se o endereço está correto.",
      );
    }
  };

  const toggleMode = () => {
    setIsCreatingAccount(!isCreatingAccount);
    setConfirmPassword("");
    setName("");
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.log(error);
      showCustomAlert(
        "Erro no login com o Google",
        "Não foi possível autenticar com a conta Google. Tente novamente.",
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Lume</Text>

        {isForgotPassword ? (
          <>
            <Text style={styles.subtitle}>
              Digite seu e-mail escolar ou pessoal. Enviaremos um link para você
              redefinir sua senha.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Seu e-mail"
              placeholderTextColor={isDarkMode ? "#888" : "#aaa"}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleForgotPassword}
            >
              <Text style={styles.primaryButtonText}>
                Enviar Link de Recuperação
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchModeButton}
              onPress={() => setIsForgotPassword(false)}
            >
              <Text style={styles.switchModeText}>Voltar para o Login</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>
              {isCreatingAccount
                ? "Crie sua conta para começar"
                : "Acesse sua conta para continuar"}
            </Text>

            {isCreatingAccount && (
              <TextInput
                style={styles.input}
                placeholder="Seu nome completo ou apelido"
                placeholderTextColor={isDarkMode ? "#888" : "#aaa"}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            )}

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
                onSubmitEditing={
                  isCreatingAccount ? undefined : handleEmailAuth
                }
                returnKeyType="done"
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

            {isCreatingAccount && (
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Confirme sua senha"
                  placeholderTextColor={isDarkMode ? "#888" : "#aaa"}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  // Adicionamos o envio com o Enter aqui (dispara na criação de conta)
                  onSubmitEditing={handleEmailAuth}
                  returnKeyType="done"
                />
              </View>
            )}

            {!isCreatingAccount && (
              <TouchableOpacity
                onPress={() => setIsForgotPassword(true)}
                style={styles.forgotPasswordButton}
              >
                <Text style={styles.forgotPasswordText}>Esqueci a senha</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                { marginTop: isCreatingAccount ? 10 : 0 },
              ]}
              onPress={handleEmailAuth}
            >
              <Text style={styles.primaryButtonText}>
                {isCreatingAccount ? "Cadastrar" : "Entrar"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchModeButton}
              onPress={toggleMode}
            >
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
              <Text style={styles.googleButtonText}>
                Continuar com o Google
              </Text>
            </TouchableOpacity>
          </>
        )}
        <Modal
          visible={customAlert.visible}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.alertOverlay}>
            <View style={styles.alertBox}>
              <Text style={styles.alertTitle}>{customAlert.title}</Text>
              <Text style={styles.alertMessage}>{customAlert.message}</Text>

              <TouchableOpacity
                style={styles.alertButton}
                onPress={() =>
                  setCustomAlert({ ...customAlert, visible: false })
                }
              >
                <Text style={styles.alertButtonText}>OK, entendi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
      lineHeight: 20,
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
    forgotPasswordButton: { alignSelf: "flex-end", marginBottom: 20 },
    forgotPasswordText: {
      color: isDarkMode ? "#82B1FF" : "#0056b3",
      fontWeight: "600",
      fontSize: 14,
    },
    primaryButton: {
      backgroundColor: "#0056b3",
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: "center",
      marginBottom: 16,
    },
    primaryButtonText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 16 },
    switchModeButton: { alignItems: "center", marginBottom: 24 },
    switchModeText: {
      color: isDarkMode ? "#82B1FF" : "#0056b3",
      fontWeight: "600",
      fontSize: 14,
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
    alertButtonText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
  });
