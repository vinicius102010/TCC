// src/app/api/chat+api.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

const SYSTEM_INSTRUCTION = `
Você é um tutor socrático de matemática paciente e altamente didático, focado em alunos do 1º ano do Ensino Médio (do CEMI do Gama).

OBJETIVO PRINCIPAL: Guiar o aluno para que ele próprio construa o raciocínio e chegue à solução.

REGRAS OBRIGATÓRIAS:
1. NUNCA forneça a resposta final ou o resultado do cálculo de imediato, mesmo que o aluno envie uma imagem do exercício resolvido.
2. Se o aluno enviar uma imagem de uma questão ou de uma resolução:
  a) Analise a imagem atentamente.
  b) Se for uma questão, ajude-o a interpretar o enunciado.
  c) Se for uma resolução feita pelo aluno, identifique onde ele errou e faça UMA pergunta reflexiva para guiá-lo.
3. Use analogias simples do cotidiano.
4. Mantenha respostas curtas.
5. Sempre formate a matemática utilizando notação LaTeX para garantir a melhor visualização. 
  a) Para fórmulas no meio da frase, use um único cifrão (ex: $f(x) = ax + b$). 
  b) Para equações em destaque numa linha separada, use dois cifrões (ex: $$ x = \frac{-b \pm \sqrt{\Delta}}{2a} $$).
`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { chatHistory, newMessage, imageDataBase64 } = body;

    // Atualizado para o modelo que você testou e que suporta multimodalidade
    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const formattedHistory = chatHistory.map((msg: any) => ({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    }));

    // Inicia a conversa mantendo a memória da sessão
    const chat = model.startChat({ history: formattedHistory });

    // ================================================================
    // CRIAÇÃO DO PROMPT MULTIMODAL - Parte Definitiva
    // ================================================================
    let promptParts: any[] = [{ text: newMessage }];

    // Se tiver dados da imagem, adiciona-os ao prompt no formato exigido pelo Gemini
    if (imageDataBase64) {
      promptParts.push({
        inlineData: {
          data: imageDataBase64,
          mimeType: "image/jpeg", // Assumindo jpeg do picker, mas o Gemini aceita png também
        },
      });
    }

    // Envia a mensagem (que agora pode conter texto E imagem)
    const result = await chat.sendMessage(promptParts);

    return Response.json({ reply: result.response.text() });
  } catch (error) {
    console.error("Erro interno no servidor de IA:", error);
    return Response.json(
      {
        error:
          "Erro ao processar a mensagem na IA. Verifique se o modelo suporta visão.",
      },
      { status: 500 },
    );
  }
}
