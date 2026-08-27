// src/app/api/chat+api.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY || "";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

const SYSTEM_INSTRUCTION = `
Você é um tutor socrático de matemática paciente e altamente didático, focado em alunos do 1º ano do Ensino Médio.

OBJETIVO PRINCIPAL: Guiar o aluno para que ele próprio construa o raciocínio e chegue à solução.

REGRAS OBRIGATÓRIAS:
1. NUNCA, em hipótese alguma, forneça a resposta final ou o resultado do cálculo de imediato, mesmo que o aluno envie uma imagem do exercício resolvido.
2. Se o aluno enviar uma imagem de uma questão ou de uma resolução:
  a) Analise a imagem atentamente.
  b) Se for uma questão, ajude-o a interpretar o enunciado.
  c) Se for uma resolução feita pelo aluno, identifique onde ele errou e faça UMA pergunta reflexiva para guiá-lo.
3. Use analogias simples do cotidiano.
4. Mantenha respostas curtas e objetivas.
5. Sempre formate a matemática utilizando notação LaTeX para garantir a melhor visualização. 
  a) Para fórmulas no meio da frase, use um único cifrão (ex: $f(x) = ax + b$). 
  b) Para equações em destaque numa linha separada, use dois cifrões (ex: $$ x = \frac{-b \pm \sqrt{\Delta}}{2a} $$).
6. Caso o aluno envie uma pergunta sobre outra disciplina, responda educadamente que voce é um tutor focado em matemática, mas ajude ele, seguindo as mesmas regras anteriores.
  `;

async function callOpenRouterFallback(
  chatHistory: any[],
  newMessage: string,
  imageDataBase64: string | null,
) {
  const formattedMessages: any[] = [
    { role: "system", content: SYSTEM_INSTRUCTION },
  ];

  // Adiciona histórico anterior
  chatHistory.forEach((msg: any) => {
    formattedMessages.push({
      role: msg.sender === "user" ? "user" : "assistant",
      content: msg.text || "",
    });
  });

  // Monta a mensagem atual (com suporte a imagem multimodal ou texto simples)
  if (imageDataBase64) {
    formattedMessages.push({
      role: "user",
      content: [
        { type: "text", text: newMessage || "Analise esta imagem:" },
        {
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${imageDataBase64}`,
          },
        },
      ],
    });
  } else {
    formattedMessages.push({
      role: "user",
      content: newMessage,
    });
  }

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
        // Lista com fallback ordenado por custo e suporte multimodal
        models: [
          "deepseek/deepseek-chat",
          "openai/gpt-4o-mini",
          "google/gemini-3.1-flash-lite",
        ],
        messages: formattedMessages,
      }),
    },
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter falhou (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return (
    data.choices[0]?.message?.content ||
    "Desculpe, não consegui processar sua resposta no momento."
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { chatHistory = [], newMessage = "", imageDataBase64 = null } = body;

    // 1. TENTATIVA PRINCIPAL: Google Gemini Direto (Gratuito)
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-3.5-flash-lite",
        systemInstruction: SYSTEM_INSTRUCTION,
      });

      const formattedHistory = chatHistory.map((msg: any) => ({
        role: msg.sender === "user" ? "user" : "model",
        parts: [{ text: msg.text || "" }],
      }));

      const chat = model.startChat({ history: formattedHistory });

      let promptParts: any[] = [{ text: newMessage }];

      if (imageDataBase64) {
        promptParts.push({
          inlineData: {
            data: imageDataBase64,
            mimeType: "image/jpeg",
          },
        });
      }

      const result = await chat.sendMessage(promptParts);
      const replyText = result.response.text();

      return Response.json({ reply: replyText, source: "gemini-direct" });
    } catch (geminiError: any) {
      console.warn(
        "⚠️ Falha na API direta do Gemini. Acionando Fallback do OpenRouter...",
        geminiError?.message || geminiError,
      );

      // 2. ROTA DE EMERGÊNCIA: OpenRouter
      const fallbackReply = await callOpenRouterFallback(
        chatHistory,
        newMessage,
        imageDataBase64,
      );
      return Response.json({
        reply: fallbackReply,
        source: "openrouter-fallback",
      });
    }
  } catch (error: any) {
    console.error("Erro crítico na rota /api/chat:", error);
    return Response.json(
      { error: "Não foi possível obter resposta dos servidores de IA." },
      { status: 500 },
    );
  }
}
