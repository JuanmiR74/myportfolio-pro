import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, TrendingUp } from 'lucide-react';

export function Header() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold">PortfolioX</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <>
              <div className="flex flex-col items-end">
                <p className="text-sm font-medium">{user.email}</p>
                <p className="text-xs text-muted-foreground">Sesión activa</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Salir
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
