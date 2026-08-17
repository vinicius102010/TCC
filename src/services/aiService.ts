// src/services/aiService.ts

// Veja como o arquivo ficou limpo! Nada de chaves ou bibliotecas do Google aqui.
export const getTutorResponse = async (
  chatHistory: any[],
  newMessage: string,
) => {
  try {
    // Fazemos um POST para o nosso próprio backend local que acabamos de criar
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chatHistory,
        newMessage,
      }),
    });

    if (!response.ok) {
      throw new Error("Erro na comunicação com o backend local");
    }

    const data = await response.json();
    return data.reply; // Retorna a string que o nosso backend nos enviou
  } catch (error: any) {
    console.error("Erro ao chamar a nossa API:", error);
    return "Desculpa, estou com uma instabilidade na minha conexão no momento. Pode enviar sua dúvida novamente?";
  }
};
