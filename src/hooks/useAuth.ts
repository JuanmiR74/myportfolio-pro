import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

export function useAuth() {
  const context = useContext(AuthContext);
  
  // Si el contexto es undefined, estamos fuera del AuthProvider
  if (context === undefined) {
    // En producción, devolvemos un estado seguro para no crashear la app inmediatamente
    // En desarrollo, podríamos lanzar un error, pero para evitar el crash blanco:
    return {
      user: null,
      session: null,
      loading: true, // Asumimos carga mientras se inicia
      signUp: async () => ({ user: null, error: 'Auth no disponible' }),
      signIn: async () => ({ user: null, error: 'Auth no disponible' }),
      signOut: async () => {},
    };
  }
  
  return context;
}
