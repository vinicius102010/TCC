import { GoogleGenerativeAI } from '@google/generative-ai';

// Puxa a chave do arquivo .env
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

const genAI = new GoogleGenerativeAI(API_KEY);

// PROMPT SOCRÁTICO DE TUTORIA
const SYSTEM_INSTRUCTION = `
Você é um tutor socrático de matemática paciente e altamente didático, focado em alunos do 1º ano do Ensino Médio.

OBJETIVO PRINCIPAL: Guiar o aluno para que ele próprio construa o raciocínio e chegue à solução.

REGRAS OBRIGATÓRIAS:
1. NUNCA forneça a resposta final ou o resultado do cálculo de imediato, mesmo que o aluno peça diretamente.
2. Identifique onde o aluno errou ou onde travou e faça APENAS UMA pergunta reflexiva para guiá-lo ao próximo passo.
3. Se o aluno não souber por onde começar, ajude-o a identificar os dados fornecidos pelo problema.
4. Use analogias simples do cotidiano para explicar conceitos abstratos de álgebra ou funções.
5. Mantenha respostas curtas (máximo 3 parágrafos pequenos), tom encorajador e formatação limpa (use negrito para termos matemáticos).
`;

export const getTutorResponse = async (chatHistory: any[], newMessage: string) => {
  if (!API_KEY) {
    console.error("Chave de API do Gemini não encontrada no .env!");
    return "Erro de configuração: A chave da API não foi encontrada no arquivo .env.";
  }

  try {
    // Usamos o modelo gemini-1.5-flash (rápido e gratuito)
    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      systemInstruction: SYSTEM_INSTRUCTION
    });

    // Converte o histórico de mensagens do nosso app para o formato esperado pelo Gemini
    const formattedHistory = chatHistory.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));

    // Inicia a conversa mantendo a memória da sessão
    const chat = model.startChat({
      history: formattedHistory,
    });

    const result = await chat.sendMessage(newMessage);
    return result.response.text();

  } catch (error: any) {
    console.error("Erro na resposta da IA:", error);
    return "Tive um problema ao processar sua dúvida. Pode tentar enviar novamente?";
  }
};
