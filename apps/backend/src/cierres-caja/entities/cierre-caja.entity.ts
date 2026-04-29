import { Decimal } from '@prisma/client/runtime/library';

export class CierreCaja {
  id: string;
  caja_id: string;
  fecha: Date;
  total_efectivo: Decimal;
  total_debito: Decimal;
  total_credito: Decimal;
  total_transferencia: Decimal;
  total_qr: Decimal;
  total_ventas: Decimal;
  efectivo_sistema: Decimal;
  efectivo_fisico: Decimal;
  diferencia_efectivo: Decimal;
  motivo_diferencia: string | null;
  usuario_id: string | null;
  observaciones: string | null;
  created_at: Date;
}
