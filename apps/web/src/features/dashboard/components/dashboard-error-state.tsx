"use client"

import { Card, CardContent } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"

interface DashboardErrorStateProps {
  error: Error | string;
  onRetry: () => void;
}

/**
 * Dashboard Error State
 * Display error message with retry button
 */
export function DashboardErrorState({ error, onRetry }: DashboardErrorStateProps) {
  const errorMessage = typeof error === 'string' ? error : error.message;

  return (
    <div className="flex h-full items-center justify-center p-6">
      <Card className="max-w-md border-destructive/50 bg-card shadow-sm">
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-card-foreground">
              Error al cargar el dashboard
            </h3>
            <p className="text-sm text-muted-foreground">
              {errorMessage}
            </p>
          </div>
          <Button
            onClick={onRetry}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
