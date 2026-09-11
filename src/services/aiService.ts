// src/services/aiService.ts

export type PdfFileData = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
  webFile?: File;
};

export const getTutorResponse = async (
  chatHistory: any[],
  newMessage: string,
  imageDataBase64: string | null = null,
  pdfFile: PdfFileData | null = null,
) => {
  try {
    const formData = new FormData();

    formData.append("chatHistory", JSON.stringify(chatHistory));
    formData.append("newMessage", newMessage);
    formData.append("imageDataBase64", imageDataBase64 || "");

    if (pdfFile) {
      if (pdfFile.webFile) {
        // Web: usa o objeto File fornecido pelo DocumentPicker
        formData.append("file", pdfFile.webFile);
      } else {
        // Android/iOS: o fetch do React Native aceita esse formato
        formData.append("file", {
          uri: pdfFile.uri,
          name: pdfFile.name,
          type: pdfFile.mimeType || "application/pdf",
        } as any);
      }

      formData.append("fileName", pdfFile.name);
      formData.append("fileType", pdfFile.mimeType);
    }

    const response = await fetch("/api/chat", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Erro na comunicação com o backend local");
    }

    const data = await response.json();

    return data.reply;
  } catch (error: any) {
    console.error("Erro ao chamar a nossa API:", error);

    return "Desculpa, estou com uma instabilidade na minha conexão no momento. Pode enviar sua dúvida novamente?";
  }
};

export const generateChatTitle = async (
  userMessage: string,
  aiResponse: string,
) => {
  try {
    const response = await fetch("/api/title", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userMessage,
        aiResponse,
      }),
    });

    if (!response.ok) return "Nova Conversa";

    const data = await response.json();

    return data.title;
  } catch (error) {
    console.error("Erro ao buscar título:", error);

    return "Nova Conversa";
  }
};
