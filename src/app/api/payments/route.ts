import { NextRequest, NextResponse } from 'next/server';

interface PaymentRequest {
  subscriptionId: string;
  plan: 'premium' | 'enterprise';
  paymentMethod: 'stripe' | 'paypal';
  billingInfo: {
    name: string;
    email: string;
    address?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
}

interface PaymentResult {
  success: boolean;
  paymentId?: string;
  clientSecret?: string;
  error?: string;
  message?: string;
}

// Simular integración con Stripe
class StripeService {
  private static instance: StripeService;

  static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }

  async createPaymentIntent(amount: number, currency: string = 'eur'): Promise<{ clientSecret: string; paymentIntentId: string }> {
    // Simular creación de Payment Intent
    console.log(`Creating payment intent for ${amount} ${currency}`);
    
    // Simular delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const paymentIntentId = `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const clientSecret = `${paymentIntentId}_secret_${Math.random().toString(36).substr(2, 9)}`;

    return { clientSecret, paymentIntentId };
  }

  async createSubscription(priceId: string, customerId: string): Promise<{ subscriptionId: string; clientSecret: string }> {
    // Simular creación de suscripción
    console.log(`Creating subscription for customer ${customerId} with price ${priceId}`);
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const clientSecret = `${subscriptionId}_secret_${Math.random().toString(36).substr(2, 9)}`;

    return { subscriptionId, clientSecret };
  }

  async confirmPayment(paymentIntentId: string): Promise<{ status: 'succeeded' | 'failed'; error?: string }> {
    // Simular confirmación de pago
    console.log(`Confirming payment ${paymentIntentId}`);
    
    await new Promise(resolve => setTimeout(resolve, 500));

    // Simular éxito en el 95% de los casos
    if (Math.random() < 0.95) {
      return { status: 'succeeded' };
    } else {
      return { status: 'failed', error: 'Payment failed due to insufficient funds' };
    }
  }
}

// Simular integración con PayPal
class PayPalService {
  private static instance: PayPalService;

  static getInstance(): PayPalService {
    if (!PayPalService.instance) {
      PayPalService.instance = new PayPalService();
    }
    return PayPalService.instance;
  }

  async createOrder(amount: number, currency: string = 'EUR'): Promise<{ orderId: string; approvalUrl: string }> {
    // Simular creación de orden de PayPal
    console.log(`Creating PayPal order for ${amount} ${currency}`);
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    const orderId = `PAYID-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const approvalUrl = `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`;

    return { orderId, approvalUrl };
  }

  async captureOrder(orderId: string): Promise<{ status: 'COMPLETED' | 'FAILED'; error?: string }> {
    // Simular captura de orden
    console.log(`Capturing PayPal order ${orderId}`);
    
    await new Promise(resolve => setTimeout(resolve, 800));

    // Simular éxito en el 90% de los casos
    if (Math.random() < 0.90) {
      return { status: 'COMPLETED' };
    } else {
      return { status: 'FAILED', error: 'Payment could not be processed' };
    }
  }
}

// Configuración de precios
const PRICING = {
  premium: {
    monthly: 29.99,
    yearly: 299.99,
    features: [
      '50 alertas diarias',
      'Notificaciones por email, Telegram y WhatsApp',
      'Análisis avanzado con IA',
      'Soporte prioritario',
      'Exportación de datos'
    ]
  },
  enterprise: {
    monthly: 99.99,
    yearly: 999.99,
    features: [
      'Alertas ilimitadas',
      'Todos los canales de notificación',
      'API dedicada',
      'Cuenta manager',
      'Integraciones personalizadas',
      'SLA garantizado'
    ]
  }
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'pricing') {
      return NextResponse.json(PRICING);
    }

    if (action === 'methods') {
      return NextResponse.json({
        stripe: {
          name: 'Stripe',
          description: 'Pago seguro con tarjeta de crédito/débito',
          supportedCards: ['visa', 'mastercard', 'amex', 'discover']
        },
        paypal: {
          name: 'PayPal',
          description: 'Pago a través de cuenta de PayPal',
          supportedCountries: ['ES', 'US', 'UK', 'DE', 'FR', 'IT']
        }
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in payments GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: PaymentRequest = await request.json();
    const { subscriptionId, plan, paymentMethod, billingInfo } = body;

    // Validar datos requeridos
    if (!subscriptionId || !plan || !paymentMethod || !billingInfo) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validar plan
    if (!['premium', 'enterprise'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      );
    }

    // Validar método de pago
    if (!['stripe', 'paypal'].includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Invalid payment method' },
        { status: 400 }
      );
    }

    let result: PaymentResult;

    if (paymentMethod === 'stripe') {
      result = await processStripePayment(plan, billingInfo);
    } else if (paymentMethod === 'paypal') {
      result = await processPayPalPayment(plan, billingInfo);
    } else {
      return NextResponse.json(
        { error: 'Unsupported payment method' },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function processStripePayment(plan: 'premium' | 'enterprise', billingInfo: any): Promise<PaymentResult> {
  const stripeService = StripeService.getInstance();
  const amount = PRICING[plan].monthly;

  try {
    // Crear Payment Intent
    const { clientSecret, paymentIntentId } = await stripeService.createPaymentIntent(amount, 'eur');

    return {
      success: true,
      paymentId: paymentIntentId,
      clientSecret,
      message: 'Payment intent created successfully'
    };
  } catch (error) {
    console.error('Stripe payment error:', error);
    return {
      success: false,
      error: 'Failed to create payment intent'
    };
  }
}

async function processPayPalPayment(plan: 'premium' | 'enterprise', billingInfo: any): Promise<PaymentResult> {
  const paypalService = PayPalService.getInstance();
  const amount = PRICING[plan].monthly;

  try {
    // Crear orden de PayPal
    const { orderId, approvalUrl } = await paypalService.createOrder(amount, 'EUR');

    return {
      success: true,
      paymentId: orderId,
      message: 'PayPal order created successfully',
      // En una implementación real, devolveríamos la URL de aprobación
      // approvalUrl
    };
  } catch (error) {
    console.error('PayPal payment error:', error);
    return {
      success: false,
      error: 'Failed to create PayPal order'
    };
  }
}

// Endpoint para confirmar pagos
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentId, paymentMethod, subscriptionId } = body;

    if (!paymentId || !paymentMethod) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let result: any;

    if (paymentMethod === 'stripe') {
      const stripeService = StripeService.getInstance();
      result = await stripeService.confirmPayment(paymentId);
    } else if (paymentMethod === 'paypal') {
      const paypalService = PayPalService.getInstance();
      result = await paypalService.captureOrder(paymentId);
    } else {
      return NextResponse.json(
        { error: 'Invalid payment method' },
        { status: 400 }
      );
    }

    if (result.status === 'succeeded' || result.status === 'COMPLETED') {
      // Actualizar suscripción (simulado)
      console.log(`Updating subscription ${subscriptionId} to active status`);
      
      return NextResponse.json({
        success: true,
        message: 'Payment confirmed and subscription activated'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Payment failed'
      });
    }
  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}