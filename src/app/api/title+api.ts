import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

const SYSTEM_INSTRUCTION = `
Você é um classificador automático de conversas.
SEU OBJETIVO: Ler a primeira interação (Dúvida do Aluno + Resposta do Tutor) e resumir o tema matemático central em um título de no máximo 4 palavras.
REGRA: Retorne APENAS o título. Sem aspas, sem pontos finais. (Ex: "Equação do 1º Grau", "Fatoriais").
`;

export async function POST(req: Request) {
  try {
    const { userMessage, aiResponse } = await req.json();

    const prompt = `Dúvida do Aluno: ${userMessage || '[Imagem/Áudio enviado]'}\nResposta do Tutor: ${aiResponse}`;

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      systemInstruction: SYSTEM_INSTRUCTION
    });

    const result = await model.generateContent(prompt);
    const generatedTitle = result.response.text().trim();

    return Response.json({ title: generatedTitle });
  } catch (error) {
    console.error("Erro ao gerar título:", error);
    return Response.json({ title: "Nova Conversa" }, { status: 500 });
  }
}
