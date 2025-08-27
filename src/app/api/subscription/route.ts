import { NextRequest, NextResponse } from 'next/server';

interface UserSubscription {
  id: string;
  email: string;
  plan: 'free' | 'premium' | 'enterprise';
  keywords: string[];
  notifications: {
    email: boolean;
    telegram: boolean;
    whatsapp: boolean;
  };
  preferences: {
    categories: string[];
    minBudget: number;
    regions: string[];
    frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  };
  dailyLimit: number;
  currentUsage: number;
  nextBillingDate?: string;
  status: 'active' | 'cancelled' | 'expired';
  createdAt: string;
  updatedAt: string;
}

// Simular base de datos de suscripciones
const subscriptions: UserSubscription[] = [
  {
    id: '1',
    email: 'user@example.com',
    plan: 'free',
    keywords: ['tecnología', 'software', 'consultoría'],
    notifications: {
      email: true,
      telegram: false,
      whatsapp: false
    },
    preferences: {
      categories: ['Tecnología', 'Consultoría'],
      minBudget: 10000,
      regions: ['España'],
      frequency: 'daily'
    },
    dailyLimit: 5,
    currentUsage: 2,
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z'
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    const subscription = subscriptions.find(sub => sub.email === email);

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, plan, keywords, notifications, preferences } = body;

    // Validar datos requeridos
    if (!email || !plan || !keywords || !notifications || !preferences) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verificar si ya existe una suscripción
    const existingSubscription = subscriptions.find(sub => sub.email === email);

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'Subscription already exists' },
        { status: 409 }
      );
    }

    // Crear nueva suscripción
    const newSubscription: UserSubscription = {
      id: Date.now().toString(),
      email,
      plan,
      keywords,
      notifications,
      preferences,
      dailyLimit: plan === 'free' ? 5 : plan === 'premium' ? 50 : 999,
      currentUsage: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Agregar fecha de facturación para planes de pago
    if (plan !== 'free') {
      newSubscription.nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    subscriptions.push(newSubscription);

    return NextResponse.json(newSubscription);
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, updates } = body;

    if (!email || !updates) {
      return NextResponse.json(
        { error: 'Email and updates are required' },
        { status: 400 }
      );
    }

    const subscriptionIndex = subscriptions.findIndex(sub => sub.email === email);

    if (subscriptionIndex === -1) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    const subscription = subscriptions[subscriptionIndex];

    // Actualizar suscripción
    const updatedSubscription = {
      ...subscription,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Actualizar límites diarios si cambia el plan
    if (updates.plan) {
      updatedSubscription.dailyLimit = updates.plan === 'free' ? 5 : updates.plan === 'premium' ? 50 : 999;
      
      // Agregar fecha de facturación para planes de pago
      if (updates.plan !== 'free' && subscription.plan === 'free') {
        updatedSubscription.nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      }
    }

    subscriptions[subscriptionIndex] = updatedSubscription;

    return NextResponse.json(updatedSubscription);
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    const subscriptionIndex = subscriptions.findIndex(sub => sub.email === email);

    if (subscriptionIndex === -1) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    subscriptions.splice(subscriptionIndex, 1);

    return NextResponse.json({ message: 'Subscription deleted successfully' });
  } catch (error) {
    console.error('Error deleting subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}