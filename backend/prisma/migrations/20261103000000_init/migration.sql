-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('Food', 'Transport', 'Shopping', 'Bills', 'Health', 'Entertainment', 'Education', 'Other');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('TASK', 'REMINDER');

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "category" "ExpenseCategory" NOT NULL DEFAULT 'Other',
    "note" TEXT NOT NULL DEFAULT '',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "TaskType" NOT NULL DEFAULT 'TASK',
    "dueDate" TIMESTAMP(3),
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommandHistory" (
    "id" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "spokenReply" TEXT NOT NULL,
    "actions" JSONB NOT NULL,
    "results" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommandHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Expense_date_idx" ON "Expense"("date");

-- CreateIndex
CREATE INDEX "Expense_category_idx" ON "Expense"("category");

-- CreateIndex
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");

-- CreateIndex
CREATE INDEX "Task_type_idx" ON "Task"("type");

-- CreateIndex
CREATE INDEX "Task_completed_idx" ON "Task"("completed");

