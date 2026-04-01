# Sistema de Autenticación - PortfolioX

## Descripción General

El sistema de autenticación de PortfolioX utiliza **Supabase Auth** con email y contraseña. La aplicación está protegida con autenticación obligatoria: los usuarios no autenticados son redirigidos automáticamente a `/login`.

## Componentes Principales

### 1. AuthContext (`src/contexts/AuthContext.tsx`)
Contexto React que gestiona la sesión global del usuario:
- **Estados**: `user`, `session`, `loading`
- **Métodos**: `signUp()`, `signIn()`, `signOut()`
- **Listeners**: Monitorea cambios de estado en Supabase Auth

### 2. useAuth Hook (`src/hooks/useAuth.ts`)
Hook personalizado para acceder al contexto de autenticación desde cualquier componente:
```typescript
const { user, session, loading, signIn, signUp, signOut } = useAuth();
```

### 3. Página de Login (`src/pages/Login.tsx`)
Interfaz de acceso elegante con dos modos:
- **Iniciar Sesión**: Acceso a carteras existentes
- **Registrarse**: Crear nueva cuenta
- Validaciones integradas (email válido, contraseña mínima 6 caracteres)

### 4. ProtectedRoute (`src/components/ProtectedRoute.tsx`)
Componente wrapper que:
- Protege rutas del dashboard
- Redirige a `/login` si no hay usuario autenticado
- Muestra estado de carga mientras se verifica la sesión

### 5. Header (`src/components/Header.tsx`)
Componente con información del usuario y botón de logout:
- Muestra email y estado de sesión
- Botón "Salir" funcional
- Se renderiza en la parte superior del dashboard

## Flujo de Autenticación

```
Usuario no autenticado
    ↓
Redirect a /login (ProtectedRoute)
    ↓
Login page → signIn() o signUp()
    ↓
Supabase Auth verifica credenciales
    ↓
Usuario autenticado
    ↓
Redirect a / (Dashboard)
    ↓
usePortfolio() carga datos del usuario
```

## Integración con Base de Datos

Todas las tablas incluyen `user_id` para aislar datos por usuario:

### Tablas Actualizadas
- `assets`: campo `user_id uuid REFERENCES auth.users(id)`
- `robo_advisors`: campo `user_id uuid REFERENCES auth.users(id)`
- `portfolio_settings`: campo `user_id uuid REFERENCES auth.users(id)`

### Políticas de Row Level Security (RLS)

Cada tabla tiene 4 políticas (SELECT, INSERT, UPDATE, DELETE):

```sql
-- Ejemplo para assets
CREATE POLICY "Users can view own assets"
  ON assets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own assets"
  ON assets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ... (UPDATE y DELETE análogos)
```

## Cómo Funciona usePortfolio con Autenticación

El hook `usePortfolio()` ahora:
1. Lee el usuario actual de `useAuth()`
2. Filtra todas las consultas por `.eq('user_id', user.id)`
3. Incluye automáticamente `user_id` al insertar nuevos datos
4. Valida que el usuario sea propietario antes de actualizar/eliminar

```typescript
export function usePortfolio() {
  const { user } = useAuth();

  // Todas las consultas filtran por usuario:
  const { data: dbAssets } = await supabase
    .from('assets')
    .select('*')
    .eq('user_id', user.id);

  // Inserciones incluyen user_id automáticamente:
  await supabase.from('assets').insert({
    ...asset,
    user_id: user.id
  });
}
```

## Flujo de Usuario Típico

### 1. Registro
```
Email + Contraseña
    ↓
signUp(email, password)
    ↓
Supabase crea user en auth.users
    ↓
Usuario puede iniciar sesión
```

### 2. Login
```
Email + Contraseña
    ↓
signIn(email, password)
    ↓
Supabase verifica credenciales
    ↓
Session guardada (en localStorage/cookies)
    ↓
Redirect al dashboard
```

### 3. Logout
```
Click en "Salir"
    ↓
signOut()
    ↓
Session eliminada
    ↓
Redirect a /login
```

## Estados de Carga

Durante la verificación inicial de sesión, se muestra un estado de carga para evitar parpadeos:

```typescript
if (loading) {
  return (
    <div>
      <Skeleton /> {/* Placeholders mientras se verifica */}
    </div>
  );
}
```

## Seguridad

### Validaciones Cliente
- Email debe ser válido
- Contraseña mínima 6 caracteres
- Campos requeridos en login/registro

### Seguridad en Base de Datos
- RLS activo en todas las tablas
- Políticas restrictivas: solo el propietario accede
- `user_id` como clave foránea a `auth.users`

### Sesión
- Supabase maneja tokens JWT automáticamente
- Auto-renovación de tokens
- `onAuthStateChange` mantiene sincronización

## Variables de Entorno

La configuración de Supabase se carga desde `.env`:
```
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
```

No requiere configuración adicional - Supabase Auth está integrado en el cliente.

## Pruebas

### Crear usuario de prueba
```bash
# Usar la página de login en http://localhost:5173/login
# Email: test@example.com
# Contraseña: password123
```

### Verificar RLS
- Usuario A no puede ver datos de Usuario B
- Intentos de acceso sin autenticación fallan
- Modificación sin propiedad es rechazada

## Próximos Pasos Opcionales

1. **Magic Links**: Cambiar a autenticación sin contraseña
2. **OAuth**: Integrar Google/GitHub
3. **2FA**: Autenticación multi-factor
4. **Password Reset**: Flujo de recuperación de contraseña
5. **Email Verification**: Confirmar email al registrarse

## Solución de Problemas

### Error: "Usuario no autenticado"
- Verificar que AuthProvider envuelva la app
- Revisar que useAuth se use dentro de AuthProvider

### Error: "Acceso denegado" (RLS)
- Verificar que `user_id` se incluya en inserciones
- Confirmar que RLS está activo en la tabla
- Validar politicas SQL

### Usuario no se redirige a login
- Verificar ProtectedRoute está en la ruta
- Revisar que BrowserRouter esté dentro de AuthProvider
- Comprobar que no hay rutas no protegidas incorrectamente

---

**Última actualización**: 2026-04-01
