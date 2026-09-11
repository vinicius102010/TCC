// src/app/api/chat+api.ts

import { GoogleGenerativeAI } from "@google/generative-ai";
const arrayBufferToBase64 = (arrayBuffer: ArrayBuffer) => {
  const bytes = new Uint8Array(arrayBuffer);

  let binary = "";

  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
};

const API_KEY = process.env.GEMINI_API_KEY || "";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";

const genAI = new GoogleGenerativeAI(API_KEY);

const SYSTEM_INSTRUCTION = `
Você é um tutor socrático de matemática paciente e altamente didático, focado em alunos do 1º ano do Ensino Médio.

OBJETIVO PRINCIPAL: Guiar o aluno para que ele próprio construa o raciocínio e chegue à solução.

REGRAS OBRIGATÓRIAS:
1. NUNCA, em hipótese alguma, forneça a resposta final ou o resultado do cálculo de imediato, mesmo que o aluno envie uma imagem ou um documento com o exercício resolvido.
2. Se o aluno enviar uma imagem de uma questão ou de uma resolução:
  a) Analise a imagem atentamente.
  b) Se for uma questão, ajude-o a interpretar o enunciado.
  c) Se for uma resolução feita pelo aluno, identifique onde ele errou e faça UMA pergunta reflexiva para guiá-lo.
3. Se o aluno enviar um PDF:
  a) Analise o conteúdo do documento relacionado à pergunta do aluno.
  b) Identifique o exercício, questão, exemplo ou trecho relevante.
  c) Não entregue imediatamente a resposta final.
  d) Use o conteúdo do documento para conduzir o aluno pelo raciocínio.
4. Use analogias simples do cotidiano.
5. Mantenha respostas curtas e objetivas.
6. Sempre formate a matemática utilizando notação LaTeX para garantir a melhor visualização.
  a) Para fórmulas no meio da frase, use um único cifrão (ex: $f(x) = ax + b$).
  b) Para equações em destaque numa linha separada, use dois cifrões (ex: $$ x = \\frac{-b \\pm \\sqrt{\\Delta}}{2a} $$).
7. Caso o aluno envie uma pergunta sobre outra disciplina, responda educadamente que você é um tutor focado em matemática, mas ajude ele, seguindo as mesmas regras anteriores.
`;

type UploadedPdf = {
  data: string;
  name: string;
  mimeType: string;
};

async function callOpenRouterFallback(
  chatHistory: any[],
  newMessage: string,
  imageDataBase64: string | null,
  pdfFile: UploadedPdf | null,
) {
  const formattedMessages: any[] = [
    {
      role: "system",
      content: SYSTEM_INSTRUCTION,
    },
  ];

  // Histórico anterior
  chatHistory.forEach((msg: any) => {
    formattedMessages.push({
      role: msg.sender === "user" ? "user" : "assistant",
      content: msg.text || "",
    });
  });

  // PDF
  if (pdfFile) {
    const pdfDataUrl = `data:application/pdf;base64,${pdfFile.data}`;

    formattedMessages.push({
      role: "user",
      content: [
        {
          type: "text",
          text: newMessage || "Analise este documento PDF.",
        },
        {
          type: "file",
          file: {
            filename: pdfFile.name,
            file_data: pdfDataUrl,
          },
        },
      ],
    });
  }
  // Imagem - fluxo atual preservado
  else if (imageDataBase64) {
    formattedMessages.push({
      role: "user",
      content: [
        {
          type: "text",
          text: newMessage || "Analise esta imagem:",
        },
        {
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${imageDataBase64}`,
          },
        },
      ],
    });
  }
  // Somente texto
  else {
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
    const formData = (await req.formData()) as any;

    const chatHistoryRaw = formData.get("chatHistory");
    const newMessageRaw = formData.get("newMessage");
    const imageDataBase64Raw = formData.get("imageDataBase64");

    const chatHistory =
      typeof chatHistoryRaw === "string" ? JSON.parse(chatHistoryRaw) : [];

    const newMessage = typeof newMessageRaw === "string" ? newMessageRaw : "";

    const imageDataBase64 =
      typeof imageDataBase64Raw === "string" && imageDataBase64Raw.length > 0
        ? imageDataBase64Raw
        : null;

    const file = formData.get("file");

    let pdfFile: UploadedPdf | null = null;

    if (file instanceof File) {
      const mimeType = file.type || "application/pdf";

      if (mimeType !== "application/pdf") {
        return Response.json(
          {
            error: "Apenas arquivos PDF são aceitos.",
          },
          {
            status: 400,
          },
        );
      }

      const MAX_FILE_SIZE = 50 * 1024 * 1024;

      if (file.size > MAX_FILE_SIZE) {
        return Response.json(
          {
            error: "O PDF não pode ter mais de 50 MB.",
          },
          {
            status: 400,
          },
        );
      }

      const arrayBuffer = await file.arrayBuffer();

      const base64Data = arrayBufferToBase64(arrayBuffer);

      pdfFile = {
        data: base64Data,
        name: file.name || "documento.pdf",
        mimeType,
      };
    }

    // =========================================================
    // 1. TENTATIVA PRINCIPAL: GOOGLE GEMINI
    // =========================================================

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-3.5-flash-lite",
        systemInstruction: SYSTEM_INSTRUCTION,
      });

      const formattedHistory = chatHistory.map((msg: any) => ({
        role: msg.sender === "user" ? "user" : "model",
        parts: [
          {
            text: msg.text || "",
          },
        ],
      }));

      const chat = model.startChat({
        history: formattedHistory,
      });

      const promptParts: any[] = [];

      if (newMessage) {
        promptParts.push({
          text: newMessage,
        });
      }

      // PDF
      if (pdfFile) {
        promptParts.push({
          inlineData: {
            data: pdfFile.data,
            mimeType: "application/pdf",
          },
        });
      }

      // Imagem - fluxo atual preservado
      if (imageDataBase64) {
        promptParts.push({
          inlineData: {
            data: imageDataBase64,
            mimeType: "image/jpeg",
          },
        });
      }

      // Evita enviar um array vazio
      if (promptParts.length === 0) {
        promptParts.push({
          text: "",
        });
      }

      const result = await chat.sendMessage(promptParts);

      const replyText = result.response.text();

      return Response.json({
        reply: replyText,
        source: "gemini-direct",
      });
    } catch (geminiError: any) {
      console.warn(
        "⚠️ Falha na API direta do Gemini. Acionando fallback do OpenRouter...",
        geminiError?.message || geminiError,
      );

      // =======================================================
      // 2. FALLBACK: OPENROUTER
      // =======================================================

      const fallbackReply = await callOpenRouterFallback(
        chatHistory,
        newMessage,
        imageDataBase64,
        pdfFile,
      );

      return Response.json({
        reply: fallbackReply,
        source: "openrouter-fallback",
      });
    }
  } catch (error: any) {
    console.error("Erro crítico na rota /api/chat:", error);

    return Response.json(
      {
        error: "Não foi possível obter resposta dos servidores de IA.",
      },
      {
        status: 500,
      },
    );
  }
}
