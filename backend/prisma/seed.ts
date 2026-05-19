import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Users ──────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@wms.com' },
    update: {},
    create: {
      email: 'admin@wms.com',
      passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'ADMIN',
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@wms.com' },
    update: {},
    create: {
      email: 'manager@wms.com',
      passwordHash,
      firstName: 'Budi',
      lastName: 'Santoso',
      role: 'MANAGER',
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: 'staff@wms.com' },
    update: {},
    create: {
      email: 'staff@wms.com',
      passwordHash,
      firstName: 'Siti',
      lastName: 'Rahayu',
      role: 'STAFF',
    },
  });

  console.log('✅ Users created');

  // ─── Warehouses ─────────────────────────────────────────
  const warehouses = await Promise.all([
    prisma.warehouse.upsert({
      where: { code: 'WH-JKT-01' },
      update: {},
      create: {
        code: 'WH-JKT-01',
        name: 'Jakarta Main Warehouse',
        address: 'Jl. Industri No. 15, Kawasan Industri Pulogadung',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postalCode: '13920',
        phone: '021-4603000',
        capacity: 50000,
        status: 'ACTIVE',
      },
    }),
    prisma.warehouse.upsert({
      where: { code: 'WH-SBY-01' },
      update: {},
      create: {
        code: 'WH-SBY-01',
        name: 'Surabaya Distribution Center',
        address: 'Jl. Rungkut Industri III No. 25',
        city: 'Surabaya',
        province: 'Jawa Timur',
        postalCode: '60293',
        phone: '031-8431000',
        capacity: 35000,
        status: 'ACTIVE',
      },
    }),
    prisma.warehouse.upsert({
      where: { code: 'WH-BDG-01' },
      update: {},
      create: {
        code: 'WH-BDG-01',
        name: 'Bandung Regional Warehouse',
        address: 'Jl. Soekarno-Hatta No. 789',
        city: 'Bandung',
        province: 'Jawa Barat',
        postalCode: '40286',
        phone: '022-7831000',
        capacity: 20000,
        status: 'ACTIVE',
      },
    }),
  ]);

  console.log('✅ Warehouses created');

  // ─── Assign users to warehouses ─────────────────────────
  await prisma.userWarehouse.createMany({
    data: [
      { userId: admin.id, warehouseId: warehouses[0].id, isPrimary: true },
      { userId: manager.id, warehouseId: warehouses[0].id, isPrimary: true },
      { userId: manager.id, warehouseId: warehouses[1].id, isPrimary: false },
      { userId: staff.id, warehouseId: warehouses[0].id, isPrimary: true },
    ],
  });

  // ─── Categories ─────────────────────────────────────────
  const categories = await Promise.all([
    prisma.category.upsert({ where: { name: 'Electronics' }, update: {}, create: { name: 'Electronics', description: 'Electronic devices and components' } }),
    prisma.category.upsert({ where: { name: 'Office Supplies' }, update: {}, create: { name: 'Office Supplies', description: 'General office supplies and stationery' } }),
    prisma.category.upsert({ where: { name: 'Raw Materials' }, update: {}, create: { name: 'Raw Materials', description: 'Manufacturing raw materials' } }),
    prisma.category.upsert({ where: { name: 'Packaging' }, update: {}, create: { name: 'Packaging', description: 'Packaging materials and containers' } }),
    prisma.category.upsert({ where: { name: 'Safety Equipment' }, update: {}, create: { name: 'Safety Equipment', description: 'Workplace safety and PPE' } }),
  ]);

  console.log('✅ Categories created');

  // ─── Suppliers ──────────────────────────────────────────
  const suppliers = await Promise.all([
    prisma.supplier.upsert({
      where: { code: 'SUP-001' }, update: {},
      create: { code: 'SUP-001', name: 'PT. Sumber Makmur Elektronik', contactPerson: 'Andi Wijaya', email: 'andi@sumbermakmur.co.id', phone: '021-5550100', city: 'Jakarta', province: 'DKI Jakarta', leadTimeDays: 5 },
    }),
    prisma.supplier.upsert({
      where: { code: 'SUP-002' }, update: {},
      create: { code: 'SUP-002', name: 'CV. Mitra Jaya Abadi', contactPerson: 'Dewi Lestari', email: 'dewi@mitrajaya.co.id', phone: '031-5550200', city: 'Surabaya', province: 'Jawa Timur', leadTimeDays: 7 },
    }),
    prisma.supplier.upsert({
      where: { code: 'SUP-003' }, update: {},
      create: { code: 'SUP-003', name: 'PT. Perkasa Material Indo', contactPerson: 'Rudi Hartono', email: 'rudi@perkasa.co.id', phone: '022-5550300', city: 'Bandung', province: 'Jawa Barat', leadTimeDays: 3 },
    }),
  ]);

  console.log('✅ Suppliers created');

  // ─── Products ───────────────────────────────────────────
  const products = await Promise.all([
    prisma.product.upsert({
      where: { sku: 'ELEC-MOUSE-001' }, update: {},
      create: { sku: 'ELEC-MOUSE-001', name: 'Wireless Mouse Logitech M331', categoryId: categories[0].id, unit: 'pcs', minStockLevel: 50, maxStockLevel: 2000, reorderPoint: 100, reorderQuantity: 500, unitPrice: 175000 },
    }),
    prisma.product.upsert({
      where: { sku: 'ELEC-KB-001' }, update: {},
      create: { sku: 'ELEC-KB-001', name: 'Mechanical Keyboard K845', categoryId: categories[0].id, unit: 'pcs', minStockLevel: 30, maxStockLevel: 1000, reorderPoint: 60, reorderQuantity: 300, unitPrice: 850000 },
    }),
    prisma.product.upsert({
      where: { sku: 'OFF-PAPER-A4' }, update: {},
      create: { sku: 'OFF-PAPER-A4', name: 'A4 Paper 80gsm (ream)', categoryId: categories[1].id, unit: 'ream', minStockLevel: 200, maxStockLevel: 10000, reorderPoint: 500, reorderQuantity: 2000, unitPrice: 52000 },
    }),
    prisma.product.upsert({
      where: { sku: 'RAW-STEEL-001' }, update: {},
      create: { sku: 'RAW-STEEL-001', name: 'Steel Plate 2mm (sheet)', categoryId: categories[2].id, unit: 'sheet', minStockLevel: 100, maxStockLevel: 5000, reorderPoint: 200, reorderQuantity: 1000, unitPrice: 320000 },
    }),
    prisma.product.upsert({
      where: { sku: 'PKG-BOX-M' }, update: {},
      create: { sku: 'PKG-BOX-M', name: 'Cardboard Box Medium 30x20x15cm', categoryId: categories[3].id, unit: 'pcs', minStockLevel: 500, maxStockLevel: 20000, reorderPoint: 1000, reorderQuantity: 5000, unitPrice: 8500 },
    }),
    prisma.product.upsert({
      where: { sku: 'SAFE-HELM-001' }, update: {},
      create: { sku: 'SAFE-HELM-001', name: 'Safety Helmet Class A', categoryId: categories[4].id, unit: 'pcs', minStockLevel: 20, maxStockLevel: 500, reorderPoint: 40, reorderQuantity: 200, unitPrice: 125000 },
    }),
    prisma.product.upsert({
      where: { sku: 'ELEC-MON-24' }, update: {},
      create: { sku: 'ELEC-MON-24', name: 'LED Monitor 24 inch FHD', categoryId: categories[0].id, unit: 'pcs', minStockLevel: 15, maxStockLevel: 300, reorderPoint: 30, reorderQuantity: 100, unitPrice: 2350000 },
    }),
    prisma.product.upsert({
      where: { sku: 'OFF-INK-BK' }, update: {},
      create: { sku: 'OFF-INK-BK', name: 'Printer Ink Cartridge Black', categoryId: categories[1].id, unit: 'pcs', minStockLevel: 50, maxStockLevel: 2000, reorderPoint: 100, reorderQuantity: 500, unitPrice: 185000 },
    }),
  ]);

  console.log('✅ Products created');

  // ─── Product-Supplier links ─────────────────────────────
  await prisma.productSupplier.createMany({
    data: [
      { productId: products[0].id, supplierId: suppliers[0].id, unitCost: 140000, isPrimary: true, minOrderQty: 50 },
      { productId: products[1].id, supplierId: suppliers[0].id, unitCost: 680000, isPrimary: true, minOrderQty: 20 },
      { productId: products[2].id, supplierId: suppliers[1].id, unitCost: 42000, isPrimary: true, minOrderQty: 100 },
      { productId: products[3].id, supplierId: suppliers[2].id, unitCost: 265000, isPrimary: true, minOrderQty: 50 },
      { productId: products[4].id, supplierId: suppliers[1].id, unitCost: 6500, isPrimary: true, minOrderQty: 500 },
      { productId: products[6].id, supplierId: suppliers[0].id, unitCost: 1900000, isPrimary: true, minOrderQty: 5 },
    ],
  });

  // ─── Inventory (Initial stock) ──────────────────────────
  const inventoryData = [];
  for (const product of products) {
    for (const warehouse of warehouses) {
      inventoryData.push({
        productId: product.id,
        warehouseId: warehouse.id,
        quantity: Math.floor(Math.random() * 300) + 50,
        availableQty: 0, // will be set equal to quantity
        reservedQty: 0,
      });
    }
  }

  // Set availableQty = quantity
  inventoryData.forEach((item) => {
    item.availableQty = item.quantity;
  });

  for (const inv of inventoryData) {
    await prisma.inventory.upsert({
      where: {
        productId_warehouseId_locationId: {
          productId: inv.productId,
          warehouseId: inv.warehouseId,
          locationId: '',
        },
      },
      update: { quantity: inv.quantity, availableQty: inv.availableQty },
      create: {
        productId: inv.productId,
        warehouseId: inv.warehouseId,
        quantity: inv.quantity,
        availableQty: inv.availableQty,
        reservedQty: 0,
      },
    });
  }

  console.log('✅ Inventory initialized');

  // ─── Sample Movements (for historical data) ─────────────
  const movementTypes = ['STOCK_IN', 'STOCK_OUT', 'STOCK_IN', 'STOCK_OUT', 'TRANSFER'] as const;

  for (let i = 0; i < 50; i++) {
    const type = movementTypes[i % movementTypes.length];
    const daysAgo = Math.floor(Math.random() * 90) + 1;
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);

    const randomProduct = products[Math.floor(Math.random() * products.length)];
    const quantity = Math.floor(Math.random() * 100) + 10;

    const movementData: any = {
      referenceNumber: `MOV-SEED-${String(i + 1).padStart(4, '0')}`,
      type,
      status: 'COMPLETED',
      createdById: [admin.id, manager.id, staff.id][i % 3],
      approvedById: [admin.id, manager.id][i % 2],
      approvedAt: createdAt,
      completedAt: createdAt,
      createdAt,
      lines: {
        create: [{
          productId: randomProduct.id,
          quantity,
          unitCost: Number(randomProduct.unitPrice) * 0.8,
        }],
      },
    };

    if (type === 'STOCK_IN') {
      movementData.destinationWarehouseId = warehouses[Math.floor(Math.random() * warehouses.length)].id;
      movementData.supplierId = suppliers[Math.floor(Math.random() * suppliers.length)].id;
    } else if (type === 'STOCK_OUT') {
      movementData.sourceWarehouseId = warehouses[Math.floor(Math.random() * warehouses.length)].id;
    } else {
      const srcIdx = Math.floor(Math.random() * warehouses.length);
      let destIdx = Math.floor(Math.random() * warehouses.length);
      while (destIdx === srcIdx) destIdx = (destIdx + 1) % warehouses.length;
      movementData.sourceWarehouseId = warehouses[srcIdx].id;
      movementData.destinationWarehouseId = warehouses[destIdx].id;
    }

    try {
      await prisma.inventoryMovement.create({ data: movementData });
    } catch (e) {
      // Skip duplicates
    }
  }

  console.log('✅ Sample movements created');
  console.log('🎉 Database seeding complete!');
  console.log('');
  console.log('📝 Default credentials:');
  console.log('   Admin:   admin@wms.com / password123');
  console.log('   Manager: manager@wms.com / password123');
  console.log('   Staff:   staff@wms.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
