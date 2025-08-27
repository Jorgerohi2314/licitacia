import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

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
  riskLevel: 'low' | 'medium' | 'high';
  estimatedComplexity: 'low' | 'medium' | 'high';
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalysisRequest = await request.json();
    const { tender, userKeywords, userPreferences } = body;

    // Inicializar ZAI para análisis con IA
    const zai = await ZAI.create();

    // Crear prompt para análisis de licitación
    const analysisPrompt = `
    Analiza la siguiente licitación pública y proporciona un análisis detallado:

    Título: ${tender.title}
    Descripción: ${tender.description}
    Organización: ${tender.organization}
    Presupuesto: €${tender.budget.toLocaleString()}
    Fecha límite: ${tender.deadline}

    Palabras clave del usuario: ${userKeywords.join(', ')}
    Categorías de interés: ${userPreferences.categories.join(', ')}
    Presupuesto mínimo: €${userPreferences.minBudget.toLocaleString()}

    Proporciona el análisis en formato JSON con las siguientes claves:
    - relevanceScore: puntuación de relevancia del 0 al 100
    - category: categoría principal de la licitación
    - summary: resumen conciso de 2-3 frases
    - keywords: array de palabras clave relevantes
    - requirements: array de requisitos principales
    - recommendations: array de recomendaciones para participar
    - riskLevel: "low", "medium" o "high"
    - estimatedComplexity: "low", "medium" o "high"
    `;

    // Realizar análisis con IA
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en licitaciones públicas y contratación administrativa. Analiza las oportunidades de negocio y proporciona insights detallados en formato JSON.'
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    // Extraer y parsear la respuesta JSON
    const analysisText = completion.choices[0]?.message?.content || '{}';
    let analysisResult: AnalysisResult;

    try {
      // Limpiar el texto para extraer JSON
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No se encontró JSON en la respuesta');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // Valores por defecto si falla el parseo
      analysisResult = {
        relevanceScore: 50,
        category: 'General',
        summary: 'Licitación pública que requiere análisis adicional.',
        keywords: ['licitación', 'contrato'],
        requirements: ['Requisitos estándar'],
        recommendations: ['Analizar detenidamente los requisitos'],
        riskLevel: 'medium',
        estimatedComplexity: 'medium'
      };
    }

    // Calcular puntuación de relevancia adicional basada en preferencias del usuario
    const keywordMatches = userKeywords.filter(keyword =>
      tender.title.toLowerCase().includes(keyword.toLowerCase()) ||
      tender.description.toLowerCase().includes(keyword.toLowerCase())
    ).length;

    const categoryMatch = userPreferences.categories.includes(analysisResult.category);
    const budgetMatch = tender.budget >= userPreferences.minBudget;

    // Ajustar puntuación de relevancia
    let finalRelevanceScore = analysisResult.relevanceScore;
    if (keywordMatches > 0) finalRelevanceScore += keywordMatches * 10;
    if (categoryMatch) finalRelevanceScore += 15;
    if (budgetMatch) finalRelevanceScore += 10;

    finalRelevanceScore = Math.min(100, Math.max(0, finalRelevanceScore));

    analysisResult.relevanceScore = Math.round(finalRelevanceScore);

    return NextResponse.json(analysisResult);
  } catch (error) {
    console.error('Error analyzing tender:', error);
    return NextResponse.json(
      { error: 'Error analyzing tender' },
      { status: 500 }
    );
  }
}