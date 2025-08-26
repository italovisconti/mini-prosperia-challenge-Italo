export type Item = {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category: number | null; // Account.id
};

export type ParsedTransaction = {
  type: "expense" | "income";
  amount: number | null;
  subtotalAmount: number | null;
  taxAmount: number | null;
  taxPercentage: number | null;
  currency: string | null; // ISO 4217
  date: string | null; // YYYY-MM-DD
  description: string | null;
  invoiceNumber: string | null;
  paymentMethod: "CARD" | "CASH" | "TRANSFER" | "OTHER" | null;
  // paymentStatus
  // paymentMethod
  // paidAt
  category: number | null; // Account.id
  vendorId: number | null;

  rawText: string | null;

  items: Item[];
};

// model Transaction {
//   id               String          @id @default(cuid())
//   createdAt        DateTime        @default(now())
//   updatedAt        DateTime        @updatedAt

//   type             TransactionType
//   amount           Decimal         @db.Decimal(14, 2)
//   subtotalAmount   Decimal?        @db.Decimal(14, 2)
//   taxAmount        Decimal?        @db.Decimal(14, 2)
//   taxPercentage    Decimal?        @db.Decimal(5, 2)
//   currency         String
//   date             DateTime

//   description      String?
//   invoiceNumber    String?

//   paymentStatus    PaymentStatus   @default(unpaid)
//   paymentMethod    PaymentMethod?
//   paidAt           DateTime?

//   // Relaciones contables
//   accountId        Int?
//   account          Account?        @relation("TransactionCategory", fields: [accountId], references: [id])

//   vendorId         Int?
//   vendor           Vendor?         @relation(fields: [vendorId], references: [id])

//   paymentAccountId Int?
//   paymentAccount   Account?        @relation("TransactionPaymentAccount", fields: [paymentAccountId], references: [id])

//   // 1–1 con Receipt: FK único
//   receiptId        String?         @unique
//   receipt          Receipt?        @relation(name: "ReceiptTransaction", fields: [receiptId], references: [id])

//   rawText          String?

//   @@index([type, date])
//   @@index([vendorId])
//   @@index([accountId])
// }