import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const [totalTenders, relevantTenders, alertsSent, activeUsers, topCategoriesRaw, recentTenders] = await Promise.all([
      db.tender.count(),
      db.tender.count({ where: { relevanceScore: { gte: 70 } } }),
      db.notification.count({ where: { status: 'SENT' } }),
      db.user.count(),
      db.tender.groupBy({ by: ['category'], _count: { category: true }, orderBy: { _count: { category: 'desc' } }, take: 5 }),
      db.tender.findMany({ orderBy: { publishedAt: 'desc' }, take: 10 }),
    ]);

    const topCategories = topCategoriesRaw.map(c => ({ category: c.category, count: c._count.category }));
    const recentActivity = recentTenders.map(t => ({
      action: 'Nueva licitación',
      timestamp: t.publishedAt.toISOString(),
      details: `${t.title} - ${t.organization}`,
    }));

    // Conversión de ejemplo: usuarios con suscripción premium / total
    const [premiumUsers, conversionBase] = await Promise.all([
      db.subscription.count({ where: { plan: 'PREMIUM' } }),
      db.user.count(),
    ]);
    const conversionRate = conversionBase > 0 ? Number(((premiumUsers / conversionBase) * 100).toFixed(1)) : 0;

    return NextResponse.json({
      totalTenders,
      relevantTenders,
      alertsSent,
      activeUsers,
      conversionRate,
      topCategories,
      recentActivity,
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}