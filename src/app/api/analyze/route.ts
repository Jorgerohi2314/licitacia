import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

interface AnalysisRequest {
  tender: {
    title: string;
    description: string;
    organization: string;
    budget: number;
    deadline: string;
  };
  userKeywords: string[];
  userPreferences: {
    categories: string[];
    minBudget: number;
    regions: string[];
  };
}

interface AnalysisResult {
  relevanceScore: number;
  category: string;
  summary: string;
  keywords: string[];
  requirements: string[];
  recommendations: string[];
  riskLevel: "low" | "medium" | "high";
  estimatedComplexity: "low" | "medium" | "high";
}

function extractJsonFromResponse(content: string): string {
  // 1. Intentar encontrar bloque de código JSON
  const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1];
  }

  // 2. Intentar encontrar el primer '{' y el último '}'
  const firstBrace = content.indexOf('{');
  const lastBrace = content.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return content.substring(firstBrace, lastBrace + 1);
  }

  return content;
}

function sanitizeJsonString(jsonString: string): string {
  // Eliminar caracteres de control que pueden romper JSON.parse
  return jsonString.replace(/[\u0000-\u001F]+/g, " ");
}

export async function POST(request: NextRequest) {
  try {
    let body: AnalysisRequest;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("Error al parsear el cuerpo de la solicitud:", parseError);
      return NextResponse.json(
        { success: false, error: "Cuerpo de solicitud inválido" },
        { status: 400 }
      );
    }

    if (!body || !body.tender) {
      return NextResponse.json(
        { success: false, error: "Datos de licitación faltantes" },
        { status: 400 }
      );
    }

    const { tender, userKeywords, userPreferences } = body;

    if (!tender.title) {
      return NextResponse.json(
        { success: false, error: "El título de la licitación es obligatorio" },
        { status: 400 }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY no está configurada");
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const analysisPrompt = `
      Eres un experto analista de licitaciones públicas. Tu tarea es analizar la siguiente licitación y extraer información estructurada.
      
      DATOS DE LA LICITACIÓN:
      Título: ${tender.title}
      Descripción: ${tender.description}
      Organización: ${tender.organization}
      Presupuesto: ${tender.budget}
      Plazo: ${tender.deadline}
      
      PERFIL DEL USUARIO:
      Palabras clave de interés: ${userKeywords.join(", ")}
      Categorías preferidas: ${userPreferences.categories.join(", ")}
      Presupuesto mínimo deseado: ${userPreferences.minBudget}
      Regiones de interés: ${userPreferences.regions.join(", ")}

      INSTRUCCIONES:
      1. Analiza la relevancia basándote en el perfil del usuario.
      2. Extrae palabras clave y requisitos técnicos.
      3. Evalúa el riesgo y la complejidad.
      4. Genera un resumen ejecutivo.

      FORMATO DE RESPUESTA:
      Devuelve ÚNICAMENTE un objeto JSON válido. NO incluyas texto antes ni después del JSON. NO uses markdown.
      
      El JSON debe tener EXACTAMENTE esta estructura:
      {
        "relevanceScore": (número entero 0-100),
        "category": "(categoría principal inferida)",
        "summary": "(resumen ejecutivo de 2-3 frases)",
        "keywords": ["palabra1", "palabra2", ...],
        "requirements": ["requisito1", "requisito2", ...],
        "recommendations": ["recomendación1", "recomendación2", ...],
        "riskLevel": "low" | "medium" | "high",
        "estimatedComplexity": "low" | "medium" | "high"
      }
    `;

    const response = await groq.chat.completions.create({
      model: "deepseek-r1-distill-llama-70b", // Modelo potente y rápido
      messages: [
        {
          role: "system",
          content: "Eres una API que solo responde con JSON válido. No incluyas explicaciones ni markdown."
        },
        { role: "user", content: analysisPrompt }
      ],
      temperature: 0.1,
      max_tokens: 1500,
      response_format: { type: "json_object" } // Forzar modo JSON si el modelo lo soporta
    });

    const aiResponse = response.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error("No se recibió respuesta de Groq");
    }

    // Limpieza y extracción robusta
    const jsonString = sanitizeJsonString(extractJsonFromResponse(aiResponse.trim()));

    let analysis: AnalysisResult;
    try {
      analysis = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Error al parsear JSON de IA:", parseError);
      console.error("String recibido:", jsonString);

      // Intento de recuperación simple o fallback
      analysis = {
        relevanceScore: 0,
        category: "Error de Análisis",
        summary: "La IA no pudo generar un análisis estructurado válido. Por favor revise la licitación manualmente.",
        keywords: [],
        requirements: [],
        recommendations: ["Revisión manual requerida"],
        riskLevel: "medium",
        estimatedComplexity: "medium"
      };
    }

    // Normalización de valores (asegurar que enums sean correctos)
    const validLevels = ["low", "medium", "high"];
    if (!validLevels.includes(analysis.riskLevel?.toLowerCase())) analysis.riskLevel = "medium";
    if (!validLevels.includes(analysis.estimatedComplexity?.toLowerCase())) analysis.estimatedComplexity = "medium";
    analysis.riskLevel = analysis.riskLevel.toLowerCase() as any;
    analysis.estimatedComplexity = analysis.estimatedComplexity.toLowerCase() as any;

    return NextResponse.json({ success: true, analysis });

  } catch (error: any) {
    console.error("Error en /api/analyze:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}