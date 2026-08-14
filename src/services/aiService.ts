// Para usar esta biblioteca, precisaremos rodar: npx expo install @google/generative-ai
import { GoogleGenerativeAI } from '@google/generative-ai';

// Colocaremos a chave no arquivo .env posteriormente
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "COLE_SUA_CHAVE_AQUI_TEMPORARIAMENTE";
const genAI = new GoogleGenerativeAI(API_KEY);

// O PROMPT SOCRÁTICO - O Coração da Tutoria
const SYSTEM_INSTRUCTION = `
Você é um tutor de matemática paciente e altamente didático, focado em ajudar alunos do 1º ano do ensino médio.
SEU OBJETIVO: Guiar o aluno para que ele próprio chegue à resposta.

REGRAS ESTRITAS:
1. NUNCA dê a resposta final do problema de imediato, mesmo que o aluno implore.
2. Analise a dúvida ou o erro lógico do aluno e faça UMA pergunta direcionada para que ele reflita sobre o próximo passo.
3. Quebre conceitos abstratos (como funções ou equações de 1º grau) em analogias simples do dia a dia.
4. Mantenha as suas respostas curtas, em tom de conversa e extremamente encorajadoras.
5. Utilize formatação amigável (como listas ou negrito) para destacar termos matemáticos.
`;

export const getTutorResponse = async (chatHistory: any[], newMessage: string) => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION
    });

    // Converte o histórico do Firebase para o formato que a API entende,
    // garantindo que o tutor lembre de todo o raciocínio discutido.
    const formattedHistory = chatHistory.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));

    const chat = model.startChat({
      history: formattedHistory,
    });

    const result = await chat.sendMessage(newMessage);
    return result.response.text();

  } catch (error) {
    console.error("Erro na API de IA:", error);
    return "Desculpa, estou com um pequeno problema de conexão neste momento. Podes tentar enviar a tua dúvida novamente?";
  }
};
