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
  // Buscar JSON entre bloques de código
  const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1];
  }
  
  // Buscar JSON directo
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }
  
  return content;
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalysisRequest = await request.json();
    const { tender, userKeywords, userPreferences } = body;

    // Validar que tenemos la API key
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY no está configurada");
    }

    // Crear cliente de Groq
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Crear prompt mejorado para análisis
    const analysisPrompt = `
      Analiza la siguiente licitación y devuelve ÚNICAMENTE un JSON válido sin texto adicional:

      Título: ${tender.title}
      Descripción: ${tender.description}
      Organización: ${tender.organization}
      Presupuesto: ${tender.budget}
      Plazo: ${tender.deadline}
      
      Palabras clave del usuario: ${userKeywords.join(", ")}
      Preferencias: 
      - Categorías: ${userPreferences.categories.join(", ")}
      - Presupuesto mínimo: ${userPreferences.minBudget}
      - Regiones: ${userPreferences.regions.join(", ")}

      Devuelve SOLO este JSON (sin markdown, sin explicaciones):
      {
        "relevanceScore": [número entre 0 y 100],
        "category": "[categoría principal]",
        "summary": "[resumen breve]",
        "keywords": ["palabra1", "palabra2", "palabra3"],
        "requirements": ["requisito1", "requisito2"],
        "recommendations": ["recomendación1", "recomendación2"],
        "riskLevel": "[low/medium/high]",
        "estimatedComplexity": "[low/medium/high]"
      }
    `;

    // Llamada a la API de Groq
    const response = await groq.chat.completions.create({
      model: "deepseek-r1-distill-llama-70b",
      messages: [{ role: "user", content: analysisPrompt }],
      temperature: 0.1, // Reducir temperatura para respuestas más consistentes
      max_tokens: 1000,
    });

    console.log("Respuesta completa de Groq:", JSON.stringify(response, null, 2));

    // Extraer respuesta
    const aiResponse = response.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error("No se recibió respuesta de Groq");
    }

    console.log("Contenido de la respuesta:", aiResponse);

    // Extraer JSON de la respuesta
    const jsonString = extractJsonFromResponse(aiResponse.trim());
    console.log("JSON extraído:", jsonString);

    let analysis: AnalysisResult;
    try {
      analysis = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Error al parsear JSON:", parseError);
      console.error("String que falló:", jsonString);
      
      // Fallback: crear respuesta por defecto
      analysis = {
        relevanceScore: 0,
        category: "Sin categorizar",
        summary: "No se pudo analizar la licitación",
        keywords: [],
        requirements: ["Error en el análisis"],
        recommendations: ["Revisar manualmente"],
        riskLevel: "high",
        estimatedComplexity: "high"
      };
    }

    // Validar que el análisis tiene la estructura correcta
    const isValidAnalysis = (obj: any): obj is AnalysisResult => {
      return (
        typeof obj === 'object' &&
        typeof obj.relevanceScore === 'number' &&
        typeof obj.category === 'string' &&
        typeof obj.summary === 'string' &&
        Array.isArray(obj.keywords) &&
        Array.isArray(obj.requirements) &&
        Array.isArray(obj.recommendations) &&
        ['low', 'medium', 'high'].includes(obj.riskLevel) &&
        ['low', 'medium', 'high'].includes(obj.estimatedComplexity)
      );
    };

    if (!isValidAnalysis(analysis)) {
      console.error("Estructura de análisis inválida:", analysis);
      throw new Error("La respuesta de Groq no tiene la estructura esperada");
    }

    return NextResponse.json({ success: true, analysis });

  } catch (error: any) {
    console.error("Error en /api/analyze:", error);
    
    // Respuesta de error más detallada
    const errorMessage = error instanceof Error ? error.message : "Error interno del servidor";
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}