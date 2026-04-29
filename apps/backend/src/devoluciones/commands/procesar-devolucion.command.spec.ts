import { ProcesarDevolucionCommand } from './procesar-devolucion.command';

describe('ProcesarDevolucionCommand', () => {
  it('should create a valid command with all required fields', () => {
    const command = new ProcesarDevolucionCommand(
      '123e4567-e89b-12d3-a456-426614174000', // venta_id (UUID string)
      '123e4567-e89b-12d3-a456-426614174001', // producto_id (UUID string)
      5, // cantidad
      'Producto defectuoso', // motivo
    );

    expect(command.venta_id).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(command.producto_id).toBe('123e4567-e89b-12d3-a456-426614174001');
    expect(command.cantidad).toBe(5);
    expect(command.motivo).toBe('Producto defectuoso');
  });

  it('should create a command without motivo', () => {
    const command = new ProcesarDevolucionCommand(
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174001',
      5,
    );

    expect(command.venta_id).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(command.producto_id).toBe('123e4567-e89b-12d3-a456-426614174001');
    expect(command.cantidad).toBe(5);
    expect(command.motivo).toBeUndefined();
  });

  it('should handle integer cantidad values', () => {
    const command = new ProcesarDevolucionCommand(
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174001',
      3,
      'Peso incorrecto',
    );

    expect(command.cantidad).toBe(3);
    expect(command.motivo).toBe('Peso incorrecto');
  });

  it('should preserve all properties without modification', () => {
    const inputData = {
      venta_id: '123e4567-e89b-12d3-a456-426614174099',
      producto_id: '123e4567-e89b-12d3-a456-426614174088',
      cantidad: 10,
      motivo: 'Cliente insatisfecho',
    };

    const command = new ProcesarDevolucionCommand(
      inputData.venta_id,
      inputData.producto_id,
      inputData.cantidad,
      inputData.motivo,
    );

    expect(command).toMatchObject(inputData);
  });
});