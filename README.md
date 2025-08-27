# Sistema de Alertas Premium para Licitaciones Públicas

Un sistema completo de monitorización y alertas de oportunidades de negocio en contrataciones públicas, basado en el análisis de plantillas n8n y implementado con Next.js 15.

## 🚀 Características

### Core Features
- **Extracción Automatizada**: Scraping de fuentes oficiales (BOE, DOUE, plataformas autonómicas)
- **Clasificación con IA**: Análisis inteligente de licitaciones usando OpenAI/ZAI
- **Alertas Multi-canal**: Notificaciones por email, Telegram y WhatsApp
- **Sistema de Suscripciones**: Planes gratuito, premium y empresarial
- **Dashboard en Tiempo Real**: Métricas y reportes detallados
- **Pasarelas de Pago**: Integración con Stripe y PayPal

### Technical Features
- **Arquitectura Serverless**: Construido con Next.js 15 y App Router
- **Base de Datos**: Prisma ORM con SQLite
- **APIs RESTful**: Endpoints completos para todas las funcionalidades
- **Manejo de Errores**: Sistema robusto de logging y monitoreo
- **UI/UX Moderna**: Interfaz construida con shadcn/ui y Tailwind CSS

## 📋 Arquitectura del Sistema

### Frontend (Next.js)
```
src/
├── app/
│   ├── page.tsx                 # Dashboard principal
│   ├── api/                     # Rutas API
│   │   ├── metrics/             # Métricas del sistema
│   │   ├── tenders/             # Gestión de licitaciones
│   │   ├── analyze/             # Análisis con IA
│   │   ├── subscription/        # Gestión de suscripciones
│   │   ├── scrape/              # Scraping de fuentes
│   │   ├── notifications/       # Sistema de notificaciones
│   │   ├── payments/            # Pasarelas de pago
│   │   └── logs/                # Logging y errores
│   └── lib/
│       └── db.ts                # Cliente Prisma
├── components/
│   ├── ui/                      # Componentes shadcn/ui
│   └── dashboard.tsx            # Componente principal
└── lib/
    └── utils.ts                 # Utilidades
```

### Backend (API Routes)
- **`/api/metrics`**: Métricas del dashboard y estadísticas
- **`/api/tenders`**: CRUD de licitaciones y filtrado
- **`/api/analyze`**: Análisis de licitaciones con IA
- **`/api/subscription`**: Gestión de suscripciones de usuarios
- **`/api/scrape`**: Scraping de fuentes oficiales
- **`/api/notifications`**: Envío de notificaciones multi-canal
- **`/api/payments`**: Procesamiento de pagos (Stripe/PayPal)
- **`/api/logs`**: Sistema de logging y monitoreo

### Base de Datos (Prisma + SQLite)
- **Users**: Gestión de usuarios
- **Subscriptions**: Planes y límites
- **Tenders**: Licitaciones y análisis
- **Notifications**: Historial de notificaciones
- **PaymentHistory**: Transacciones de pago
- **ScrapingSources**: Configuración de fuentes
- **ErrorLogs**: Registro de errores

## 🛠️ Instalación y Configuración

### Prerrequisitos
- Node.js 18+
- npm o yarn
- Cuenta de OpenAI para la API de IA
- Cuentas de Stripe y PayPal para pagos (opcional)

### Instalación
```bash
# Clonar el repositorio
git clone <repository-url>
cd public-tenders-alerts

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# Inicializar base de datos
npx prisma generate
npx prisma db push

# Iniciar servidor de desarrollo
npm run dev
```

### Configuración de Servicios

#### OpenAI/ZAI
```bash
# Obtener API key de OpenAI
# https://platform.openai.com/api-keys
OPENAI_API_KEY="sk-your-key"

# Configurar ZAI (si está disponible)
ZAI_API_KEY="your-z-ai-key"
```

#### Stripe
```bash
# Configurar claves de Stripe
# https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY="sk_test_your-secret-key"
STRIPE_PUBLISHABLE_KEY="pk_test_your-publishable-key"
```

#### Telegram Bot
```bash
# Crear bot con @BotFather
TELEGRAM_BOT_TOKEN="your-bot-token"
```

## 📊 Uso del Sistema

### 1. Dashboard Principal
Accede a `http://localhost:3000` para ver el dashboard con:
- Métricas en tiempo real
- Licitaciones recientes
- Gestión de suscripciones
- Configuración de alertas

### 2. Gestión de Suscripciones
- **Plan Gratuito**: 5 alertas diarias, solo email
- **Plan Premium**: 50 alertas diarias, todos los canales
- **Plan Empresarial**: Alertas ilimitadas, API dedicada

### 3. Configuración de Alertas
- Añade palabras clave personalizadas
- Selecciona categorías de interés
- Configura canales de notificación
- Establece filtros de presupuesto

### 4. Monitoreo y Logs
- Accede a `/api/logs?action=list` para ver logs
- Usa `/api/logs?action=stats` para estadísticas
- Exporta logs en JSON o CSV

## 🔧 Endpoints API

### Métricas
```http
GET /api/metrics
```

### Licitaciones
```http
GET /api/tenders?keywords=tecnologia,software&limit=10
POST /api/tenders
```

### Análisis con IA
```http
POST /api/analyze
Content-Type: application/json

{
  "tender": {
    "title": "Desarrollo de software",
    "description": "Se necesita desarrollo...",
    "budget": 50000
  },
  "userKeywords": ["tecnología", "software"]
}
```

### Suscripciones
```http
GET /api/subscription?email=user@example.com
POST /api/subscription
PUT /api/subscription
DELETE /api/subscription?email=user@example.com
```

### Notificaciones
```http
GET /api/notifications?subscriptionId=123&limit=20
POST /api/notifications
PUT /api/notifications  # Envío masivo
```

### Pagos
```http
GET /api/payments?action=pricing
POST /api/payments
PUT /api/payments  # Confirmar pago
```

## 🏗️ Arquitectura de n8n Inspirada

El sistema está inspirado en las plantillas de n8n analizadas:

### Patrones Implementados
- **Web Scraping**: Similar a "Scrape and summarize webpages with AI"
- **AI Analysis**: Basado en plantillas de clasificación con OpenAI
- **Email Notifications**: Inspirado en "Email Summary Agent"
- **Telegram Integration**: Similar a "Telegram AI Chatbot"
- **Subscription Management**: Basado en "Email Subscription Service"

### Mejoras sobre n8n
- **Escalabilidad**: Arquitectura serverless auto-escalable
- **Persistencia**: Base de datos estructurada con Prisma
- **UI Completa**: Dashboard moderno y responsive
- **API RESTful**: Integración fácil con otros sistemas
- **Coste-efectivo**: Sin costes por nodo o ejecución

## 📈 Métricas y Monitoreo

### KPIs Principales
- **Total de Licitaciones**: Número total de oportunidades detectadas
- **Licitaciones Relevantes**: Oportunidades que coinciden con criterios
- **Alertas Enviadas**: Notificaciones entregadas exitosamente
- **Tasa de Conversión**: Usuarios que se convierten a premium
- **Engagement**: Uso activo del sistema

### Monitoreo
- **Logs en Tiempo Real**: Registro detallado de todas las operaciones
- **Error Tracking**: Detección y notificación de errores
- **Performance Monitoring**: Tiempos de respuesta y uso de recursos
- **Business Analytics**: Métricas de negocio y crecimiento

## 🔒 Seguridad

### Medidas Implementadas
- **Validación de Input**: Sanitización de todos los datos de entrada
- **Rate Limiting**: Límites de peticiones por usuario
- **Authentication**: Sistema de autenticación de usuarios
- **Authorization**: Control de acceso basado en roles
- **Data Encryption**: Cifrado de datos sensibles
- **Secure Headers**: Headers de seguridad HTTP

### Mejoras de Seguridad Planeadas
- [ ] Implementar JWT para autenticación
- [ ] Añadir CAPTCHA para formularios públicos
- [ ] Implementar políticas de CORS restrictivas
- [ ] Añadir auditoría de seguridad

## 🚀 Despliegue

### Desarrollo
```bash
npm run dev
# Acceder a http://localhost:3000
```

### Producción
```bash
# Build de la aplicación
npm run build

# Iniciar servidor de producción
npm start

# Verificar código
npm run lint
```

### Docker
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contribuciones

1. Fork del repositorio
2. Crear rama de feature (`git checkout -b feature/amazing-feature`)
3. Commit de cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está licenciado bajo la MIT License - ver el archivo [LICENSE](LICENSE) para detalles.

## 🙏 Agradecimientos

- **n8n**: Por la inspiración en las plantillas de automatización
- **OpenAI**: Por la API de inteligencia artificial
- **Stripe & PayPal**: Por las soluciones de pago
- **Vercel**: Por la plataforma de despliegue

## 📞 Soporte

Para soporte técnico:
- Abrir un issue en GitHub
- Email: support@public-tenders-alerts.com
- Documentación: [Wiki del Proyecto](wiki-url)

---

**Construido con ❤️ utilizando Next.js 15 y inspirado en las mejores prácticas de automatización de n8n**# licitacia
# licitacia
