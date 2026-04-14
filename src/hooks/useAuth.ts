import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    // En desarrollo, lanzar error para detectar el problema
    // En producción, retornar un valor seguro para evitar crash
    if (process.env.NODE_ENV === 'development') {
      throw new Error('useAuth must be used within an AuthProvider');
    }
    // Valor seguro para producción durante SSR o inicialización
    return {
      user: null,
      session: null,
      loading: true,
      signUp: async () => ({ user: null, error: 'Auth not ready' }),
      signIn: async () => ({ user: null, error: 'Auth not ready' }),
      signOut: async () => {},
    };
  }
  
  return context;
}
