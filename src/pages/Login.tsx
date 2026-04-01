import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { TrendingUp } from 'lucide-react';

type Mode = 'signin' | 'signup';

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Completa todos los campos');
      return;
    }

    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error);
        } else {
          toast.success('Sesión iniciada');
          navigate('/');
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          toast.error(error);
        } else {
          toast.success('Registro exitoso. Revisa tu correo para confirmar.');
          setEmail('');
          setPassword('');
          setMode('signin');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/5 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">PortfolioX</h1>
            <p className="text-xs text-muted-foreground">Gestión Inteligente de Inversiones</p>
          </div>
        </div>

        <Card className="border-border/50 bg-card/95 backdrop-blur shadow-lg">
          <CardHeader className="space-y-2">
            <CardTitle>
              {mode === 'signin' ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </CardTitle>
            <CardDescription>
              {mode === 'signin'
                ? 'Accede a tu cartera de inversiones'
                : 'Regístrate para comenzar a gestionar tu portafolio'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Procesando...' : mode === 'signin' ? 'Iniciar Sesión' : 'Registrarse'}
              </Button>
            </form>

            <div className="mt-6 border-t border-border/50 pt-6">
              <p className="text-sm text-center text-muted-foreground mb-3">
                {mode === 'signin'
                  ? '¿No tienes cuenta?'
                  : '¿Ya tienes cuenta?'}
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setMode(mode === 'signin' ? 'signup' : 'signin');
                  setEmail('');
                  setPassword('');
                }}
                disabled={loading}
              >
                {mode === 'signin' ? 'Crear Cuenta' : 'Iniciar Sesión'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          Tus datos están protegidos con encriptación de grado empresarial.
        </p>
      </div>
    </div>
  );
}
