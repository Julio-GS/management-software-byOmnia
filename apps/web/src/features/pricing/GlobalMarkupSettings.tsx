'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Slider } from '@/shared/components/ui/slider';
import { toast } from '@/hooks/use-toast';
import { usePricingAPI } from '@/hooks/use-pricing-api';
import { Loader2 } from 'lucide-react';

export function GlobalMarkupSettings() {
  const [markup, setMarkup] = useState(30);
  const [isLoading, setIsLoading] = useState(false);
  const { updateGlobalMarkup, isAvailable } = usePricingAPI();

  const handleSave = async () => {
    if (!isAvailable) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Pricing API is only available in desktop app',
      });
      return;
    }

    setIsLoading(true);
    try {
      await updateGlobalMarkup(markup);
      toast({
        title: 'Success',
        description: 'Global markup updated successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update markup',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAvailable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Global Markup</CardTitle>
          <CardDescription>Feature only available in desktop app</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Global Markup</CardTitle>
        <CardDescription>
          Default markup percentage applied to all products without specific markup
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Slider
            value={[markup]}
            onValueChange={([v]) => setMarkup(v)}
            min={0}
            max={100}
            step={1}
            className="flex-1"
            disabled={isLoading}
          />
          <Input
            type="number"
            value={markup}
            onChange={(e) => setMarkup(Number(e.target.value))}
            className="w-20"
            min={0}
            max={100}
            disabled={isLoading}
          />
          <span className="text-muted-foreground font-medium">%</span>
        </div>
        <div className="rounded-lg bg-muted p-4">
          <p className="text-sm text-muted-foreground">
            Example: A product with cost $100 will have a suggested price of{' '}
            <span className="font-bold text-foreground">${(100 * (1 + markup / 100)).toFixed(2)}</span>
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </CardFooter>
    </Card>
  );
}
