import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keywordsParam = searchParams.get('keywords');
    const keywords = keywordsParam ? keywordsParam.split(',').map(k => k.trim()).filter(Boolean) : [];
    const category = searchParams.get('category') || undefined;
    const minBudget = searchParams.get('minBudget');
    const minRelevance = searchParams.get('minRelevance');
    const aiCategory = searchParams.get('aiCategory');
    const region = searchParams.get('region') || undefined;
    const province = searchParams.get('province') || undefined;
    const q = searchParams.get('q') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '1000', 10), 1000);

    const where: any = {};

    if (category) {
      where.category = { contains: category };
    }
    
    if (aiCategory) {
      where.aiCategory = aiCategory;
    }
    
    if (region) {
      where.region = region;
    }
    
    if (province) {
      where.province = province;
    }
    
    if (minBudget) {
      const budgetNum = Number(minBudget);
      if (!Number.isNaN(budgetNum)) {
        where.budget = { gte: budgetNum };
      }
    }
    
    if (minRelevance) {
      const relevanceNum = Number(minRelevance);
      if (!Number.isNaN(relevanceNum)) {
        where.relevanceScore = { gte: relevanceNum };
      }
    }

    const orClauses: any[] = [];
    if (q) {
      orClauses.push(
        { title: { contains: q } },
        { summary: { contains: q } },
        { description: { contains: q } },
        { aiSummary: { contains: q } }
      );
    }
    if (keywords.length > 0) {
      for (const kw of keywords) {
        orClauses.push(
          { keywords: { contains: kw } },
          { title: { contains: kw } },
          { summary: { contains: kw } },
          { aiKeywords: { contains: kw } }
        );
      }
    }
    if (orClauses.length > 0) {
      where.OR = orClauses;
    }

    const tenders = await db.tender.findMany({
      where,
      orderBy: [{ publishedAt: 'desc' }],
      take: limit,
    });

    const normalized = tenders.map(t => ({
      id: t.id,
      title: t.title,
      organization: t.organization,
      budget: t.budget ?? null,
      deadline: t.deadline.toISOString().split('T')[0],
      category: t.category,
      relevanceScore: t.relevanceScore,
      status: t.status.toLowerCase(),
      summary: t.summary ?? '',
      keywords: safeParseArray(t.keywords),
      source: t.source,
      sourceUrl: t.sourceUrl ?? null,
      publishedAt: t.publishedAt.toISOString(),
      // AI Analysis fields
      aiCategory: t.aiCategory,
      aiSectorTags: safeParseArray(t.aiSectorTags),
      aiSummary: t.aiSummary,
      aiKeywords: safeParseArray(t.aiKeywords),
      aiRecommendations: safeParseArray(t.aiRecommendations),
      aiAnalyzedAt: t.aiAnalyzedAt?.toISOString(),
      riskLevel: t.riskLevel?.toLowerCase(),
      complexity: t.complexity?.toLowerCase(),
      region: t.region,
      province: t.province
    }));

    return NextResponse.json(normalized);
  } catch (error) {
    console.error('Error fetching tenders:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, tenderId } = body as { action: 'process' | 'send' | 'archive'; tenderId: string };

    if (!tenderId || !action) {
      return NextResponse.json({ error: 'tenderId y action son requeridos' }, { status: 400 });
    }

    const statusMap: Record<string, 'PROCESSED' | 'SENT' | 'ARCHIVED'> = {
      process: 'PROCESSED',
      send: 'SENT',
      archive: 'ARCHIVED',
    };

    const newStatus = statusMap[action];
    if (!newStatus) {
      return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }

    const updated = await db.tender.update({
      where: { id: tenderId },
      data: { status: newStatus },
    });

    return NextResponse.json({ id: updated.id, status: updated.status.toLowerCase() });
  } catch (error) {
    console.error('Error processing tender:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

function safeParseArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}