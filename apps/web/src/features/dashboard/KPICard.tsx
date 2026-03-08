import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  subtitle?: string;
  icon?: React.ReactNode;
  type?: 'currency' | 'number' | 'percentage';
  status?: 'good' | 'warning' | 'critical';
}

export function KPICard({
  title,
  value,
  change,
  subtitle,
  icon,
  type = 'number',
  status,
}: KPICardProps) {
  const formatValue = (val: string | number): string => {
    if (typeof val === 'string') return val;

    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val);
      case 'percentage':
        return `${val.toFixed(1)}%`;
      default:
        return val.toLocaleString('es-CO');
    }
  };

  const getChangeColor = (changeValue: number) => {
    if (changeValue > 0) return 'text-green-600';
    if (changeValue < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getStatusColor = () => {
    switch (status) {
      case 'good':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'critical':
        return 'bg-red-50 border-red-200';
      default:
        return '';
    }
  };

  return (
    <Card className={getStatusColor()}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium mt-2 ${getChangeColor(change)}`}>
            {change > 0 ? (
              <ArrowUpIcon className="h-3 w-3" />
            ) : change < 0 ? (
              <ArrowDownIcon className="h-3 w-3" />
            ) : null}
            <span>
              {change > 0 ? '+' : ''}
              {change.toFixed(1)}% vs ayer
            </span>
          </div>
        )}
        {status && (
          <Badge
            variant={status === 'good' ? 'default' : status === 'warning' ? 'secondary' : 'destructive'}
            className="mt-2"
          >
            {status === 'good' ? 'Bueno' : status === 'warning' ? 'Alerta' : 'Crítico'}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
