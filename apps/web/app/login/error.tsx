'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';
import { ShieldAlert, RefreshCcw, Home } from 'lucide-react';

export default function LoginError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log error to console for debugging in development
    console.error('Login error boundary caught:', error);
  }, [error]);

  const handleGoHome = () => {
    // Clear any auth state and redirect to home
    router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-destructive" />
            <CardTitle className="text-2xl font-bold">Error de autenticación</CardTitle>
          </div>
          <CardDescription>
            Hubo un problema al procesar tu solicitud de inicio de sesión
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>No se pudo iniciar sesión</AlertTitle>
            <AlertDescription>
              {process.env.NODE_ENV === 'development' 
                ? error.message 
                : 'Ocurrió un error durante la autenticación. Por favor, verifica tus credenciales e intenta nuevamente.'}
            </AlertDescription>
          </Alert>

          {error.digest && process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
              Error ID: {error.digest}
            </div>
          )}

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Posibles soluciones:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Verifica tu correo electrónico y contraseña</li>
              <li>Asegúrate de tener conexión a internet</li>
              <li>Intenta recargar la página</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button
            onClick={reset}
            className="w-full"
            variant="default"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Intentar nuevamente
          </Button>
          <Button
            onClick={handleGoHome}
            variant="outline"
            className="w-full"
          >
            <Home className="mr-2 h-4 w-4" />
            Volver al inicio
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
