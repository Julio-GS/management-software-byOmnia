'use client';

import { useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';
import { AlertCircle, RefreshCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console for debugging in development
    console.error('Global error boundary caught:', error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <CardTitle className="text-2xl font-bold">Algo salió mal</CardTitle>
          </div>
          <CardDescription>
            Ha ocurrido un error inesperado en la aplicación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {process.env.NODE_ENV === 'development' 
                ? error.message 
                : 'No se pudo completar la operación. Por favor, intenta nuevamente.'}
            </AlertDescription>
          </Alert>

          {error.digest && process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
              Error ID: {error.digest}
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            Si el problema persiste, contacta al administrador del sistema.
          </p>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button
            onClick={reset}
            className="flex-1"
            variant="default"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Intentar de nuevo
          </Button>
          <Button
            onClick={() => window.location.href = '/'}
            variant="outline"
            className="flex-1"
          >
            Volver al inicio
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
