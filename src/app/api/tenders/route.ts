import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keywordsParam = searchParams.get('keywords');
    const keywords = keywordsParam ? keywordsParam.split(',').map(k => k.trim()).filter(Boolean) : [];
    const category = searchParams.get('category') || undefined;
    const minBudget = searchParams.get('minBudget');
    const q = searchParams.get('q') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    const where: any = {};

    if (category) {
      where.category = { equals: category, mode: 'insensitive' };
    }
    if (minBudget) {
      const budgetNum = Number(minBudget);
      if (!Number.isNaN(budgetNum)) {
        where.budget = { gte: budgetNum };
      }
    }

    const orClauses: any[] = [];
    if (q) {
      orClauses.push(
        { title: { contains: q, mode: 'insensitive' } },
        { summary: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } }
      );
    }
    if (keywords.length > 0) {
      for (const kw of keywords) {
        // keywords está almacenado como JSON string, usamos contains simple
        orClauses.push(
          { keywords: { contains: kw } },
          { title: { contains: kw, mode: 'insensitive' } },
          { summary: { contains: kw, mode: 'insensitive' } }
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

    // Adaptar formato de salida: parsear keywords/requirements JSON strings
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
    }));

    return NextResponse.json(normalized);
  } catch (error) {
    console.error('Error fetching tenders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}