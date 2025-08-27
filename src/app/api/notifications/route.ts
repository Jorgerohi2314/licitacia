import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

interface NotificationRequest {
  type: 'email' | 'telegram' | 'whatsapp';
  recipient: string;
  subject?: string;
  message: string;
  tender?: {
    id: string;
    title: string;
    organization: string;
    budget: number;
    deadline: string;
    category: string;
    summary: string;
  };
  subscriptionId: string;
}

interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: string;
  type: string;
  recipient: string;
}

// Simular base de datos de notificaciones enviadas
const notificationHistory: NotificationResult[] = [];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get('subscriptionId');
    const limit = parseInt(searchParams.get('limit') || '20');

    let notifications = notificationHistory;

    if (subscriptionId) {
      // Filtrar por suscripción (en producción, esto sería más complejo)
      notifications = notifications.filter(n => n.recipient.includes(subscriptionId));
    }

    // Limitar resultados y ordenar por timestamp
    notifications = notifications
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: NotificationRequest = await request.json();
    const { type, recipient, subject, message, tender, subscriptionId } = body;

    // Validar datos requeridos
    if (!type || !recipient || !message || !subscriptionId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Inicializar ZAI para personalizar mensajes
    const zai = await ZAI.create();

    // Personalizar mensaje según el tipo de notificación y la licitación
    let personalizedMessage = message;
    
    if (tender) {
      const personalizationPrompt = `
      Personaliza el siguiente mensaje de alerta de licitación para hacerlo más atractivo y relevante:

      Mensaje original: ${message}

      Datos de la licitación:
      - Título: ${tender.title}
      - Organización: ${tender.organization}
      - Presupuesto: €${tender.budget.toLocaleString()}
      - Fecha límite: ${tender.deadline}
      - Categoría: ${tender.category}
      - Resumen: ${tender.summary}

      Tipo de notificación: ${type}
      Destinatario: ${recipient}

      Genera un mensaje personalizado que sea:
      1. Claro y conciso
      2. Profesional pero cercano
      3. Destacando los aspectos más relevantes para el destinatario
      4. Incluyendo una llamada a la acción suave
      `;

      const personalization = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en comunicación y marketing B2B. Personaliza mensajes para hacerlos más efectivos y atractivos.'
          },
          {
            role: 'user',
            content: personalizationPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      personalizedMessage = personalization.choices[0]?.message?.content || message;
    }

    // Simular envío de notificación según el tipo
    let result: NotificationResult;

    switch (type) {
      case 'email':
        result = await sendEmailNotification(recipient, subject || 'Nueva oportunidad de licitación', personalizedMessage, tender);
        break;
      case 'telegram':
        result = await sendTelegramNotification(recipient, personalizedMessage, tender);
        break;
      case 'whatsapp':
        result = await sendWhatsAppNotification(recipient, personalizedMessage, tender);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid notification type' },
          { status: 400 }
        );
    }

    // Guardar en historial
    notificationHistory.push(result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Funciones simuladas para enviar notificaciones
async function sendEmailNotification(recipient: string, subject: string, message: string, tender?: any): Promise<NotificationResult> {
  // Simular envío de email
  console.log(`Sending email to ${recipient}: ${subject}`);
  
  // Simular delay de envío
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    success: true,
    messageId: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    type: 'email',
    recipient
  };
}

async function sendTelegramNotification(recipient: string, message: string, tender?: any): Promise<NotificationResult> {
  // Simular envío de mensaje de Telegram
  console.log(`Sending Telegram message to ${recipient}`);
  
  // Simular delay de envío
  await new Promise(resolve => setTimeout(resolve, 500));

  return {
    success: true,
    messageId: `telegram_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    type: 'telegram',
    recipient
  };
}

async function sendWhatsAppNotification(recipient: string, message: string, tender?: any): Promise<NotificationResult> {
  // Simular envío de mensaje de WhatsApp
  console.log(`Sending WhatsApp message to ${recipient}`);
  
  // Simular delay de envío
  await new Promise(resolve => setTimeout(resolve, 800));

  return {
    success: true,
    messageId: `whatsapp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    type: 'whatsapp',
    recipient
  };
}

// Endpoint para enviar notificaciones masivas
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscriptionId, tenders, notificationConfig } = body;

    if (!subscriptionId || !tenders || !Array.isArray(tenders)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const results: NotificationResult[] = [];

    // Enviar notificaciones para cada licitación
    for (const tender of tenders) {
      if (notificationConfig.email) {
        const emailResult = await sendEmailNotification(
          notificationConfig.email,
          `Nueva licitación: ${tender.title}`,
          `Se ha detectado una nueva oportunidad de licitación que podría ser de tu interés:\n\n${tender.title}\n${tender.organization}\nPresupuesto: €${tender.budget.toLocaleString()}\nFecha límite: ${tender.deadline}`,
          tender
        );
        results.push(emailResult);
      }

      if (notificationConfig.telegram) {
        const telegramResult = await sendTelegramNotification(
          notificationConfig.telegram,
          `🚀 Nueva licitación: ${tender.title}\n\n${tender.organization}\n💰 €${tender.budget.toLocaleString()}\n📅 ${tender.deadline}`,
          tender
        );
        results.push(telegramResult);
      }

      if (notificationConfig.whatsapp) {
        const whatsappResult = await sendWhatsAppNotification(
          notificationConfig.whatsapp,
          `🚀 Nueva licitación: ${tender.title}\n\n${tender.organization}\n💰 €${tender.budget.toLocaleString()}\n📅 ${tender.deadline}`,
          tender
        );
        results.push(whatsappResult);
      }
    }

    return NextResponse.json({
      success: true,
      totalSent: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    });
  } catch (error) {
    console.error('Error sending bulk notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}