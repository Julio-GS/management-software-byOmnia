/**
 * Script para ejecutar el schema SQL en la base de datos Neon
 * Uso: cd apps/backend && node ../../execute-schema.js
 * (Ejecutar desde apps/backend para que cargue el .env automáticamente)
 */

const { Client } = require('./node_modules/pg');
const fs = require('fs');
const path = require('path');

// Cargar .env del directorio actual (apps/backend)
require('./node_modules/dotenv').config();

async function executeSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Neon requiere SSL
    }
  });

  try {
    console.log('🔌 Conectando a la base de datos Neon...');
    await client.connect();
    console.log('✅ Conectado exitosamente\n');

    // Leer el schema SQL (ajustar path relativo desde apps/backend)
    const schemaPath = path.join(__dirname, '..', '..', 'supermercado_schema_FINAL.sql');
    console.log(`📄 Leyendo schema desde: ${schemaPath}`);
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    console.log('🚀 Ejecutando schema SQL...\n');
    console.log('⏳ Esto puede tomar unos segundos...\n');

    // Ejecutar el schema completo
    await client.query(schemaSQL);

    console.log('✅ Schema ejecutado exitosamente!\n');

    // Verificar tablas creadas
    console.log('🔍 Verificando tablas creadas...\n');
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log(`📊 Total de tablas creadas: ${result.rows.length}\n`);
    console.log('Tablas:');
    result.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.table_name}`);
    });

    // Verificar vistas creadas
    console.log('\n🔍 Verificando vistas creadas...\n');
    const viewsResult = await client.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log(`📊 Total de vistas creadas: ${viewsResult.rows.length}\n`);
    console.log('Vistas:');
    viewsResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.table_name}`);
    });

    // Verificar datos seed
    console.log('\n🌱 Verificando datos iniciales (seed)...\n');
    
    const seedChecks = [
      { name: 'Unidades de medida', query: 'SELECT COUNT(*) FROM unidades_medida' },
      { name: 'Proveedores', query: 'SELECT COUNT(*) FROM proveedores' },
      { name: 'Rubros', query: 'SELECT COUNT(*) FROM rubros' },
      { name: 'Cajas', query: 'SELECT COUNT(*) FROM cajas' },
      { name: 'Usuarios', query: 'SELECT COUNT(*) FROM usuarios' },
      { name: 'Productos especiales (F/V/P/C)', query: 'SELECT COUNT(*) FROM productos WHERE es_codigo_especial = true' },
      { name: 'Promoción jubilados', query: 'SELECT COUNT(*) FROM promociones WHERE acumulable = true' }
    ];

    for (const check of seedChecks) {
      const result = await client.query(check.query);
      console.log(`  ✅ ${check.name}: ${result.rows[0].count} registros`);
    }

    console.log('\n🎉 ¡Base de datos configurada exitosamente!');
    console.log('\n📌 Próximo paso: Generar Prisma schema con "npx prisma db pull"');

  } catch (error) {
    console.error('\n❌ Error ejecutando el schema:');
    console.error(error.message);
    
    if (error.position) {
      console.error(`\n📍 Posición del error en el SQL: ${error.position}`);
    }
    
    if (error.code) {
      console.error(`\n🔍 Código de error PostgreSQL: ${error.code}`);
    }

    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Conexión cerrada');
  }
}

// Ejecutar
executeSchema();
