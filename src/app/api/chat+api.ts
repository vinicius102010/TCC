// src/app/api/chat+api.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

// Aqui no backend, puxamos a chave sem o EXPO_PUBLIC_
const API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

const SYSTEM_INSTRUCTION = `
Você é um tutor socrático de matemática paciente e altamente didático, focado em alunos do 1º ano do Ensino Médio.

OBJETIVO PRINCIPAL: Guiar o aluno para que ele próprio construa o raciocínio e chegue à solução.

REGRAS OBRIGATÓRIAS:
1. NUNCA forneça a resposta final ou o resultado do cálculo de imediato.
2. Identifique onde o aluno errou ou onde travou e faça APENAS UMA pergunta reflexiva para guiá-lo.
3. Use analogias simples do cotidiano.
4. Mantenha respostas curtas e use formatação (como Markdown) para a matemática (ex: frações, fatoriais).
`;

// Função que recebe a requisição (POST) do nosso próprio site
export async function POST(req: Request) {
  try {
    // Pega os dados que o chat enviou
    const body = await req.json();
    const { chatHistory, newMessage } = body;

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite", // Atualizado para o modelo que você testou
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const formattedHistory = chatHistory.map((msg: any) => ({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    }));

    const chat = model.startChat({ history: formattedHistory });
    const result = await chat.sendMessage(newMessage);

    // Devolve apenas o texto pronto para o frontend
    return Response.json({ reply: result.response.text() });
  } catch (error) {
    console.error("Erro interno no servidor:", error);
    return Response.json(
      { error: "Erro ao processar a mensagem na IA." },
      { status: 500 },
    );
  }
}
