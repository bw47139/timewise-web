generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

//
// =========================================================
// ENUMS
// =========================================================
//
enum EmployeeStatus {
  ACTIVE
  INACTIVE
  TERMINATED
}

enum PayrollPeriodStatus {
  OPEN
  LOCKED
  APPROVED
}

enum PtoTransactionType {
  ACCRUAL
  USAGE
  ADJUSTMENT
}

//
// =========================================================
// CORE MODELS
// =========================================================
//
model Organization {
  id        Int      @id @default(autoincrement())
  name      String
  timezone  String   @default("America/New_York")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  phone   String?
  address String?
  city    String?
  state   String?
  zipcode String?
  logoUrl String?

  payPeriodType      String    @default("WEEKLY")
  weekStartDay       Int?      @default(1)
  biweeklyAnchorDate DateTime?
  cutoffTime         String?   @default("17:00")

  overtimeDailyThresholdHours   Float @default(8.0)
  overtimeWeeklyThresholdHours  Float @default(40.0)
  doubletimeDailyThresholdHours Float @default(12.0)

  overtimeDailyEnabled  Boolean @default(true)
  overtimeWeeklyEnabled Boolean @default(true)
  doubleTimeEnabled     Boolean @default(false)

  autoLunchEnabled       Boolean @default(false)
  autoLunchMinutes       Int     @default(30)
  autoLunchMinimumShift  Int     @default(6)
  autoLunchDeductOnce    Boolean @default(true)
  autoLunchIgnoreIfBreak Boolean @default(true)

  ptoEnabled           Boolean @default(false)
  accrualRatePerPeriod Float   @default(0.0)
  maxPtoBalance        Float   @default(0.0)
  carryoverEnabled     Boolean @default(false)
  carryoverLimit       Float   @default(0.0)

  locations        Location[]
  employees        Employee[]
  users            User[]
  payrollPeriods   PayrollPeriod[]
  payrollSnapshots PayrollSnapshot[]
  holidays         Holiday[]
}

model Location {
  id             Int      @id @default(autoincrement())
  organizationId Int
  name           String
  timezone       String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  payPeriodType      String    @default("WEEKLY")
  weekStartDay       Int?      @default(1)
  biweeklyAnchorDate DateTime?

  semiMonthCut1 Int? @default(1)
  semiMonthCut2 Int? @default(16)
  monthlyCutDay Int? @default(1)

  cutoffTime String? @default("17:00")

  autoLunchEnabled       Boolean @default(false)
  autoLunchMinutes       Int     @default(30)
  autoLunchMinimumShift  Int     @default(6)
  autoLunchDeductOnce    Boolean @default(true)
  autoLunchIgnoreIfBreak Boolean @default(true)

  overtimeRule                  String  @default("DAILY")
  overtimeDailyEnabled          Boolean @default(true)
  overtimeDailyThresholdHours   Float   @default(8.0)
  doubletimeDailyEnabled        Boolean @default(false)
  doubletimeDailyThresholdHours Float   @default(12.0)
  overtimeWeeklyEnabled         Boolean @default(true)
  overtimeWeeklyThresholdHours  Float   @default(40.0)

  organization   Organization    @relation(fields: [organizationId], references: [id])
  employees      Employee[]
  punches        Punch[]
  payrollPeriods PayrollPeriod[]

  devices Device[] // ✅ CORRECT PLACE FOR THIS
}

model Employee {
  id             Int @id @default(autoincrement())
  organizationId Int
  locationId     Int

  firstName String
  lastName  String
  email     String?
  pin       String  @unique

  status   EmployeeStatus @default(ACTIVE)
  photoUrl String?

  faceEmbedding String?
  faceId        String?
  faceEnabled   Boolean @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  isDeleted         Boolean   @default(false)
  terminatedAt      DateTime?
  terminationReason String?

  organization Organization @relation(fields: [organizationId], references: [id])
  location     Location     @relation(fields: [locationId], references: [id])

  punches    Punch[]
  payRates   PayRate[]
  notes      EmployeeNote[]
  documents  EmployeeDocument[]
  activities EmployeeActivity[]

  ptoTransactions PtoTransaction[]
  ptoBalance      PtoBalance?
  ptoRequests     PtoRequest[]
}

model Punch {
  id         Int      @id @default(autoincrement())
  employeeId Int
  locationId Int
  type       String
  timestamp  DateTime @default(now())

  isAutoLunch          Boolean @default(false)
  isSupervisorOverride Boolean @default(false)
  overrideByUserId     Int?
  overrideReason       String?

  employee Employee @relation(fields: [employeeId], references: [id])
  location Location @relation(fields: [locationId], references: [id])
}

//
// =========================================================
// PAYROLL PERIOD CONTROL
// =========================================================
//
model PayrollPeriod {
  id             Int  @id @default(autoincrement())
  organizationId Int
  locationId     Int?

  startDate DateTime
  endDate   DateTime

  status PayrollPeriodStatus @default(OPEN)

  lockedAt       DateTime?
  lockedByUserId Int?

  approvedAt       DateTime?
  approvedByUserId Int?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  organization    Organization      @relation(fields: [organizationId], references: [id])
  location        Location?         @relation(fields: [locationId], references: [id])
  PayrollSnapshot PayrollSnapshot[]

  @@unique([organizationId, locationId, startDate, endDate])
  @@index([organizationId, startDate, endDate])
}

model PayrollSnapshot {
  id             Int @id @default(autoincrement())
  organizationId Int
  payPeriodId    Int

  snapshotData   Json
  lockedAt       DateTime @default(now())
  lockedByUserId Int?

  createdAt DateTime @default(now())

  organization Organization  @relation(fields: [organizationId], references: [id])
  payPeriod    PayrollPeriod @relation(fields: [payPeriodId], references: [id])

  @@unique([organizationId, payPeriodId])
  @@index([organizationId, payPeriodId])
}

model Holiday {
  id             Int @id @default(autoincrement())
  organizationId Int

  name  String
  date  DateTime
  paid  Boolean  @default(true)
  hours Float    @default(8)

  createdAt DateTime @default(now())

  organization Organization @relation(fields: [organizationId], references: [id])

  @@unique([organizationId, date])
  @@index([organizationId, date])
}

model PtoTransaction {
  id         Int @id @default(autoincrement())
  employeeId Int

  type   PtoTransactionType
  hours  Float
  reason String?

  createdAt DateTime @default(now())

  employee Employee @relation(fields: [employeeId], references: [id])

  @@index([employeeId])
}

model AuditLog {
  id Int @id @default(autoincrement())

  userId    Int?
  userEmail String?

  action     String
  entityType String?
  entityId   String?

  method    String?
  path      String?
  ipAddress String?

  metadata Json?

  createdAt DateTime @default(now())

  @@index([userId])
  @@index([entityType, entityId])
}

model User {
  id        Int    @id @default(autoincrement())
  email     String @unique
  password  String
  firstName String
  lastName  String
  role      String @default("ADMIN")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  organizationId Int?
  organization   Organization? @relation(fields: [organizationId], references: [id])

  activitiesCreated EmployeeActivity[] @relation("EmployeeActivityCreatedBy")
}

model PayRate {
  id            Int      @id @default(autoincrement())
  employeeId    Int
  rate          Float
  effectiveDate DateTime
  createdAt     DateTime @default(now())

  employee Employee @relation(fields: [employeeId], references: [id])
}

model EmployeeNote {
  id         Int      @id @default(autoincrement())
  employeeId Int
  note       String
  createdAt  DateTime @default(now())

  employee Employee @relation(fields: [employeeId], references: [id])
}

model DocumentType {
  id                   Int     @id @default(autoincrement())
  name                 String  @unique
  description          String?
  requiredForEmployees Boolean @default(false)

  documents EmployeeDocument[]
}

model EmployeeDocument {
  id         Int @id @default(autoincrement())
  employeeId Int

  fileName String
  fileUrl  String
  fileType String

  categoryId Int?
  createdAt  DateTime @default(now())

  expiresAt          DateTime?
  reminderDaysBefore Int?      @default(30)
  isExpired          Boolean   @default(false)

  employee Employee      @relation(fields: [employeeId], references: [id])
  category DocumentType? @relation(fields: [categoryId], references: [id])
}

model EmployeeActivity {
  id Int @id @default(autoincrement())

  employee   Employee @relation(fields: [employeeId], references: [id])
  employeeId Int

  type        String
  description String
  metadata    Json?

  createdAt DateTime @default(now())

  createdBy   User? @relation("EmployeeActivityCreatedBy", fields: [createdById], references: [id])
  createdById Int?
}

model PtoBalance {
  id         Int   @id @default(autoincrement())
  employeeId Int   @unique
  balance    Float @default(0)

  employee Employee @relation(fields: [employeeId], references: [id])

  updatedAt DateTime @updatedAt
}

model PtoRequest {
  id         Int      @id @default(autoincrement())
  employeeId Int
  date       DateTime
  hours      Float

  status String @default("APPROVED")

  createdAt DateTime @default(now())

  employee Employee @relation(fields: [employeeId], references: [id])

  @@index([employeeId, date])
}

model Device {
  id         Int       @id @default(autoincrement())
  deviceId   String    @unique
  locationId Int
  name       String?
  isActive   Boolean   @default(true)
  lastSeenAt DateTime?
  createdAt  DateTime  @default(now())

  location Location @relation(fields: [locationId], references: [id])
}
