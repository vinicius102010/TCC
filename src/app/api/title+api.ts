// src/app/api/title+api.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const SYSTEM_INSTRUCTION = `
Você é um classificador automático de conversas. 
SEU OBJETIVO: Ler a primeira interação (Dúvida do Aluno + Resposta do Tutor) e resumir o tema matemático central em um título de no máximo 4 palavras.
REGRA: Retorne APENAS o título. Sem aspas, sem pontos finais. (Ex: "Equação do 1º Grau", "Fatoriais").
`;

// Função auxiliar de Fallback via OpenRouter para o Título
async function callOpenRouterTitleFallback(prompt: string) {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:8081",
        "X-Title": "Lume Tutor",
      },
      body: JSON.stringify({
        models: ["openai/gpt-4o-mini", "deepseek/deepseek-chat"],
        messages: [
          { role: "system", content: SYSTEM_INSTRUCTION },
          { role: "user", content: prompt },
        ],
      }),
    },
  );

  if (!response.ok) {
    throw new Error("OpenRouter falhou ao gerar o título");
  }

  const data = await response.json();
  return data.choices[0]?.message?.content?.trim() || "Nova Conversa";
}

export async function POST(req: Request) {
  try {
    const { userMessage, aiResponse } = await req.json();

    const prompt = `Dúvida do Aluno: ${userMessage || "[Imagem/Áudio enviado]"}\nResposta do Tutor: ${aiResponse}`;

    // 1. TENTATIVA PRINCIPAL: Google Gemini Direto
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite",
        systemInstruction: SYSTEM_INSTRUCTION,
      });

      const result = await model.generateContent(prompt);
      const generatedTitle = result.response.text().trim();

      return Response.json({ title: generatedTitle });
    } catch (geminiError) {
      console.warn(
        "⚠️ Falha no Gemini ao gerar título. Acionando Fallback...",
        geminiError,
      );

      // 2. ROTA DE EMERGÊNCIA: OpenRouter
      const fallbackTitle = await callOpenRouterTitleFallback(prompt);
      return Response.json({ title: fallbackTitle });
    }
  } catch (error) {
    console.error("Erro interno na rota /api/title:", error);
    return Response.json({ title: "Nova Conversa" }, { status: 500 });
  }
}
