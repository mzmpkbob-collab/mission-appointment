import {
  PrismaClient,
  Role,
  AvailabilityStatus,
  AccountStatus,
  MissionStatus,
  UrgencyLevel
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/prisma';
/**
 * MANUAL OVERRIDE: 
 * We use 'as any' to force Prisma to accept the configuration 
 * regardless of the version-specific validation rules.
 */

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function clearDatabase() {
  console.log('🗑️  Clearing existing data...');
  // Delete in order of dependencies (child records first)
  await prisma.substitutionRequest.deleteMany();
  await prisma.missionAssignment.deleteMany();
  await prisma.missionApproval.deleteMany();
  await prisma.mission.deleteMany();
  await prisma.missionType.deleteMany();
  await prisma.employeeSkill.deleteMany();
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ Database cleared');
}

async function createUsers() {
  console.log('👥 Creating users...');
  const hashedPassword = await hashPassword('password123');

  const users = [
    {
      employeeId: 'EMP001',
      email: 'mzmpkbob@gmail.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: Role.ADMIN,
      position: 'System Administrator',
      phone: '+257 79 000 001',
      availabilityStatus: AvailabilityStatus.AVAILABLE,
      accountStatus: AccountStatus.ACTIVE,
    },
    {
      employeeId: 'EMP002',
      email: 'director@mas.com',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Mugisha',
      role: Role.DIRECTOR,
      position: 'Operations Director',
      phone: '+257 79 000 002',
      availabilityStatus: AvailabilityStatus.AVAILABLE,
      accountStatus: AccountStatus.ACTIVE,
    },
    {
      employeeId: 'EMP007',
      email: 'joseph@mas.com',
      password: hashedPassword,
      firstName: 'Joseph',
      lastName: 'Ndayisenga',
      role: Role.EMPLOYEE,
      position: 'Senior Software Developer',
      phone: '+257 79 000 007',
      availabilityStatus: AvailabilityStatus.AVAILABLE,
      accountStatus: AccountStatus.ACTIVE,
    }
  ];

  const createdUsers = [];
  for (const userData of users) {
    const user = await prisma.user.create({ data: userData });
    createdUsers.push(user);
    console.log(`  ✓ Created user: ${user.firstName} (${user.email})`);
  }
  return createdUsers;
}

async function createDepartments(users: any[]) {
  console.log('🏢 Creating departments...');
  const departments = [
    {
      name: 'Information Technology',
      code: 'IT',
      description: 'IT infrastructure and software development',
      budgetAllocation: 500000,
      status: 'ACTIVE',
    },
    {
      name: 'Operations',
      code: 'OPS',
      description: 'Daily operations and project coordination',
      budgetAllocation: 350000,
      status: 'ACTIVE',
    }
  ];

  const createdDepartments = [];
  for (const deptData of departments) {
    const department = await prisma.department.create({ data: deptData });
    createdDepartments.push(department);
    console.log(`  ✓ Created department: ${department.code}`);
  }

  // Link Joseph to IT
  const itDept = createdDepartments.find(d => d.code === 'IT');
  await prisma.user.updateMany({
    where: { employeeId: 'EMP007' },
    data: { departmentId: itDept?.id },
  });

  return createdDepartments;
}

async function main() {
  console.log('🌱 Starting database seed...');
  console.log('─────────────────────────────────────');

  try {
    // Explicitly connect to verify the URL is working
    await prisma.$connect();
    console.log('🔗 Database connected.');

    await clearDatabase();
    const users = await createUsers();
    await createDepartments(users);

    console.log('─────────────────────────────────────');
    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();