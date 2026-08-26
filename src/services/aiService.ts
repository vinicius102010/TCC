// src/services/aiService.ts

export const getTutorResponse = async (
  chatHistory: any[],
  newMessage: string,
  imageDataBase64: string | null = null,
) => {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chatHistory,
        newMessage,
        imageDataBase64, // Repassamos os dados binários da imagem para o backend
      }),
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
