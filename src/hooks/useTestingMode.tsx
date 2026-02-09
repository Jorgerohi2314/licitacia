'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

interface TestUser {
  id: string;
  name: string;
  email: string;
  company: string;
  sectors: string[];
  regions: string[];
  minBudget?: number;
  maxBudget?: number;
  companySize: string;
  keywords: string[];
  plan: string;
  dailyLimit: number;
}

interface TestingContextType {
  isTesting: boolean;
  testUser: TestUser | null;
  activateTesting: (email: string) => Promise<void>;
  deactivateTesting: () => Promise<void>;
}

const TestingContext = createContext<TestingContextType | undefined>(undefined);

interface TestingProviderProps {
  children: ReactNode;
}

export function TestingProvider({ children }: TestingProviderProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [testUser, setTestUser] = useState<TestUser | null>(null);

  // Check for testing mode on mount
  useEffect(() => {
    checkTestingMode();
  }, []);

  const checkTestingMode = async () => {
    try {
      // Verificar si estamos en modo testing a través de headers o cookies
      const response = await fetch('/api/auth/bypass', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        
        // Si hay usuario de testing en las cookies
        const testUserCookie = document.cookie
          .split('; ')
          .find(cookie => cookie.trim().startsWith('testing-user='))
          ?.split('=')[1];

        if (testUserCookie) {
          const userData = JSON.parse(decodeURIComponent(testUserCookie));
          setIsTesting(true);
          setTestUser(userData);
          console.log('[TESTING MODE] Activado para:', userData.email);
        }
      }
    } catch (error) {
      console.error('[TESTING MODE] Error checking mode:', error);
    }
  };

  const activateTesting = async (email: string): Promise<void> => {
    try {
      const response = await fetch('/api/auth/bypass', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsTesting(true);
        setTestUser(data.user);
        
        // Redirigir al dashboard
        window.location.href = data.redirectTo || '/dashboard';
        
        console.log('[TESTING MODE] Activado:', data.user.email);
      } else {
        const error = await response.json();
        console.error('[TESTING MODE] Error activating:', error.error);
        throw new Error(error.error || 'Error activating testing mode');
      }
    } catch (error) {
      console.error('[TESTING MODE] Activation error:', error);
      throw error;
    }
  };

  const deactivateTesting = async (): Promise<void> => {
    try {
      await fetch('/api/auth/bypass', {
        method: 'DELETE',
        credentials: 'include',
      });

      setIsTesting(false);
      setTestUser(null);
      
      console.log('[TESTING MODE] Desactivado');
      
      // Recargar la página para limpiar el estado
      window.location.href = '/auth/signin';
    } catch (error) {
      console.error('[TESTING MODE] Deactivation error:', error);
      throw error;
    }
  };

  const value: TestingContextType = {
    isTesting,
    testUser,
    activateTesting,
    deactivateTesting,
  };

  return (
    <TestingContext.Provider value={value}>
      {children}
    </TestingContext.Provider>
  );
}

export function useTestingMode(): TestingContextType {
  const context = useContext(TestingContext);
  if (context === undefined) {
    throw new Error('useTestingMode must be used within a TestingProvider');
  }
  return context;
}

// Exportar componentes útiles para testing
interface TestingBannerProps {
  onClose?: () => void;
}

export function TestingBanner({ onClose }: TestingBannerProps) {
  const { testUser, deactivateTesting } = useTestingMode();

  if (!testUser) return null;

  return (
    <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-3 text-sm">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="font-bold">🚀 MODO TESTING ACTIVADO</span>
          <span className="hidden sm:inline">
            Usuario: <strong>{testUser.email}</strong> | 
            Regiones: <strong>{testUser.regions?.join(', ')}</strong>
          </span>
        </div>
        <div className="flex items-center space-x-3">
          {onClose && (
            <button 
              onClick={onClose}
              className="text-white hover:text-orange-200 transition-colors"
            >
              ✕
            </button>
          )}
          <button
            onClick={() => deactivateTesting()}
            className="bg-white text-red-500 px-3 py-1 rounded font-semibold hover:bg-red-50 transition-colors"
          >
            Salir Testing
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook específico para obtener datos del usuario de testing
export function useTestUserData() {
  const { testUser } = useTestingMode();
  
  return {
    user: testUser,
    isTestUser: !!testUser,
    regions: testUser?.regions || [],
    sectors: testUser?.sectors || [],
    keywords: testUser?.keywords || [],
    budgetRange: {
      min: testUser?.minBudget || 0,
      max: testUser?.maxBudget || 0,
      formatted: `€${testUser?.minBudget?.toLocaleString() || '0'} - €${testUser?.maxBudget?.toLocaleString() || '∞'}`
    },
    company: testUser?.company || '',
    plan: testUser?.plan || 'free'
  };
}