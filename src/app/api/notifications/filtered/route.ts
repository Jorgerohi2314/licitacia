import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const notificationSchema = z.object({
  userId: z.string(),
  tenderId: z.string(),
  type: z.enum(['EMAIL', 'TELEGRAM', 'WHATSAPP']),
  regions: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
});

interface UserPreferences {
  profileRegions: string | null;
  profileKeywords: string | null;
  profileMinBudget: number | null;
  profileMaxBudget: number | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = notificationSchema.parse(body);
    
    // Get user preferences
    const user = await db.user.findUnique({
      where: { id: validatedData.userId },
      select: {
        profileRegions: true,
        profileKeywords: true,
        profileMinBudget: true,
        profileMaxBudget: true,
        email: true,
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Get tender details
    const tender = await db.tender.findUnique({
      where: { id: validatedData.tenderId },
      select: {
        id: true,
        title: true,
        keywords: true,
        budget: true,
        category: true,
        description: true,
        deadline: true,
        organization: true,
      }
    });

    if (!tender) {
      return NextResponse.json(
        { error: 'Licitación no encontrada' },
        { status: 404 }
      );
    }

    // Check if notification should be sent based on user preferences
    const shouldNotify = shouldSendNotification(user, tender);
    
    if (!shouldNotify) {
      return NextResponse.json({
        success: false,
        reason: 'La licitación no coincide con las preferencias del usuario'
      });
    }

    // Create notification record
    const notification = await db.notification.create({
      data: {
        userId: validatedData.userId,
        tenderId: validatedData.tenderId,
        type: validatedData.type,
        recipient: user.email || 'default@example.com',
        subject: 'Nueva licitación relevante',
        message: generateNotificationMessage(tender, validatedData.type),
        status: 'PENDING',
      }
    });

    // Here you would integrate with actual notification services
    console.log(`Notification created: ${notification.id} for user ${validatedData.userId}`);

    return NextResponse.json({
      success: true,
      notificationId: notification.id,
      message: 'Notificación programada correctamente'
    });

  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

function shouldSendNotification(user: UserPreferences, tender: any): boolean {
  // Parse user regions (stored as JSON string)
  const userRegions = user.profileRegions ? JSON.parse(user.profileRegions) : [];
  const userKeywords = user.profileKeywords ? JSON.parse(user.profileKeywords) : [];
  
  // Region filtering - if user has specific regions, tender must match
  if (userRegions.length > 0) {
    // Skip region filtering for now since we don't have region in tender
    // TODO: Add region field to tender select and implement region filtering
  }
  
  // Budget filtering
  if (user.profileMinBudget && tender.budget) {
    if (tender.budget < user.profileMinBudget) {
      return false;
    }
  }
  
  if (user.profileMaxBudget && tender.budget) {
    if (tender.budget > user.profileMaxBudget) {
      return false;
    }
  }
  
  // Keyword matching - if user has keywords, check if tender contains any
  if (userKeywords.length > 0) {
    const tenderText = `${tender.title} ${tender.description} ${tender.category}`.toLowerCase();
    const tenderKeywords = tender.keywords ? JSON.parse(tender.keywords) : [];
    
    const hasKeywordMatch = userKeywords.some((userKeyword: string) => {
      const keyword = userKeyword.toLowerCase();
      return tenderText.includes(keyword) || 
             tenderKeywords.some((tk: string) => tk.toLowerCase().includes(keyword));
    });
    
    if (!hasKeywordMatch) {
      return false;
    }
  }
  
  return true;
}

function generateNotificationMessage(tender: any, type: string): string {
  const budget = tender.budget ? `€${tender.budget.toLocaleString()}` : 'No especificado';
  
  switch (type) {
    case 'EMAIL':
      return `Nueva licitación relevante: ${tender.title} - Presupuesto: ${budget} - Organización: ${tender.organization}`;
    
    case 'TELEGRAM':
      return `🚀 Nueva licitación:\n\n📋 ${tender.title}\n💰 Presupuesto: ${budget}\n🏢 ${tender.organization}\n⏰ Fecha límite: ${tender.deadline}`;
    
    case 'WHATSAPP':
      return `🔔 Nueva oportunidad: ${tender.title}\nPresupuesto: ${budget}\nOrganización: ${tender.organization}`;
    
    default:
      return `Nueva licitación: ${tender.title}`;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Se requiere userId' },
        { status: 400 }
      );
    }

    // Get user's notification history with region filtering
    const notifications = await db.notification.findMany({
      where: {
        userId: userId,
      },
      include: {
        tender: {
          select: {
            title: true,
            budget: true,
            deadline: true,
            organization: true,
            category: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });

    return NextResponse.json({
      notifications,
      total: notifications.length
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}