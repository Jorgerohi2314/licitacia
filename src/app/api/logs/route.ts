import { NextRequest, NextResponse } from 'next/server';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  component: string;
  message: string;
  details?: any;
  userId?: string;
  requestId?: string;
  stackTrace?: string;
}

interface LogFilter {
  level?: string;
  component?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

// Simular almacenamiento de logs
const logStorage: LogEntry[] = [];

class Logger {
  private static instance: Logger;

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  log(level: LogEntry['level'], component: string, message: string, details?: any, userId?: string) {
    const logEntry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      details,
      userId,
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    // Capturar stack trace para errores
    if (level === 'error' || level === 'fatal') {
      const error = new Error();
      logEntry.stackTrace = error.stack;
    }

    logStorage.push(logEntry);

    // Mantener solo los últimos 10,000 logs
    if (logStorage.length > 10000) {
      logStorage.splice(0, logStorage.length - 10000);
    }

    // Enviar a consola para desarrollo
    if (process.env.NODE_ENV === 'development') {
      const logMethod = level === 'error' || level === 'fatal' ? 'error' : 
                       level === 'warn' ? 'warn' : 
                       level === 'debug' ? 'debug' : 'log';
      
      console[logMethod](`[${component}] ${message}`, details || '');
    }

    return logEntry;
  }

  debug(component: string, message: string, details?: any, userId?: string) {
    return this.log('debug', component, message, details, userId);
  }

  info(component: string, message: string, details?: any, userId?: string) {
    return this.log('info', component, message, details, userId);
  }

  warn(component: string, message: string, details?: any, userId?: string) {
    return this.log('warn', component, message, details, userId);
  }

  error(component: string, message: string, details?: any, userId?: string) {
    return this.log('error', component, message, details, userId);
  }

  fatal(component: string, message: string, details?: any, userId?: string) {
    return this.log('fatal', component, message, details, userId);
  }

  getLogs(filter: LogFilter = {}): LogEntry[] {
    let filteredLogs = [...logStorage];

    // Aplicar filtros
    if (filter.level) {
      filteredLogs = filteredLogs.filter(log => log.level === filter.level);
    }

    if (filter.component) {
      filteredLogs = filteredLogs.filter(log => log.component === filter.component);
    }

    if (filter.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === filter.userId);
    }

    if (filter.startDate) {
      const startDate = new Date(filter.startDate);
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= startDate);
    }

    if (filter.endDate) {
      const endDate = new Date(filter.endDate);
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= endDate);
    }

    // Ordenar por timestamp (más reciente primero)
    filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Aplicar paginación
    const offset = filter.offset || 0;
    const limit = filter.limit || 100;
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);

    return paginatedLogs;
  }

  getLogStats() {
    const stats = {
      total: logStorage.length,
      byLevel: {} as Record<string, number>,
      byComponent: {} as Record<string, number>,
      recentErrors: [] as LogEntry[]
    };

    // Contar por nivel
    logStorage.forEach(log => {
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
    });

    // Contar por componente
    logStorage.forEach(log => {
      stats.byComponent[log.component] = (stats.byComponent[log.component] || 0) + 1;
    });

    // Errores recientes (últimas 24 horas)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    stats.recentErrors = logStorage
      .filter(log => (log.level === 'error' || log.level === 'fatal') && new Date(log.timestamp) > oneDayAgo)
      .slice(0, 10);

    return stats;
  }

  exportLogs(format: 'json' | 'csv' = 'json', filter: LogFilter = {}): string {
    const logs = this.getLogs(filter);

    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }

    if (format === 'csv') {
      const headers = ['ID', 'Timestamp', 'Level', 'Component', 'Message', 'User ID', 'Details'];
      const rows = logs.map(log => [
        log.id,
        log.timestamp,
        log.level,
        log.component,
        log.message.replace(/"/g, '""'), // Escapar comillas para CSV
        log.userId || '',
        JSON.stringify(log.details || {}).replace(/"/g, '""')
      ]);

      return [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
    }

    throw new Error('Unsupported export format');
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const logger = Logger.getInstance();

    if (action === 'list') {
      const filter: LogFilter = {
        level: searchParams.get('level') || undefined,
        component: searchParams.get('component') || undefined,
        startDate: searchParams.get('startDate') || undefined,
        endDate: searchParams.get('endDate') || undefined,
        userId: searchParams.get('userId') || undefined,
        limit: parseInt(searchParams.get('limit') || '100'),
        offset: parseInt(searchParams.get('offset') || '0')
      };

      const logs = logger.getLogs(filter);
      return NextResponse.json({
        logs,
        total: logStorage.length,
        filter
      });
    }

    if (action === 'stats') {
      const stats = logger.getLogStats();
      return NextResponse.json(stats);
    }

    if (action === 'export') {
      const format = (searchParams.get('format') as 'json' | 'csv') || 'json';
      const filter: LogFilter = {
        level: searchParams.get('level') || undefined,
        component: searchParams.get('component') || undefined,
        startDate: searchParams.get('startDate') || undefined,
        endDate: searchParams.get('endDate') || undefined,
        userId: searchParams.get('userId') || undefined
      };

      const exportData = logger.exportLogs(format, filter);
      
      return new NextResponse(exportData, {
        headers: {
          'Content-Type': format === 'json' ? 'application/json' : 'text/csv',
          'Content-Disposition': `attachment; filename="logs.${format}"`
        }
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in logs GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { level, component, message, details, userId } = body;

    if (!level || !component || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: level, component, message' },
        { status: 400 }
      );
    }

    const logger = Logger.getInstance();
    const logEntry = logger.log(level, component, message, details, userId);

    return NextResponse.json({
      success: true,
      logEntry
    });
  } catch (error) {
    console.error('Error creating log entry:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Middleware para logging automático de peticiones
export async function middleware(request: NextRequest) {
  const logger = Logger.getInstance();
  
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Log de petición entrante
  logger.info('HTTP', `${request.method} ${request.url}`, {
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    requestId
  });

  // Continuar con la petición
  const response = NextResponse.next();

  // Log de respuesta
  const duration = Date.now() - startTime;
  logger.info('HTTP', `${request.method} ${request.url} completed`, {
    method: request.method,
    url: request.url,
    status: response.status,
    duration,
    requestId
  });

  return response;
}