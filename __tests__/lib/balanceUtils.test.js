/**
 * Tests for src/lib/balanceUtils.js
 *
 * Uses 5 accounts and a realistic set of transactions covering all types,
 * including cross-account transfers, to verify balance calculations.
 *
 * Accounts:
 *   acc1 — Bank USD,        initial_balance = 1000
 *   acc2 — Cash USD,        initial_balance =  200
 *   acc3 — Credit Card USD, initial_balance =    0  (expenses make it negative)
 *   acc4 — Investment USD,  initial_balance = 5000
 *   acc5 — Bank EUR,        initial_balance =  500
 *
 * Transactions (amount sign convention: income +, expense −, transfer +):
 *   tx1  2024-01-01  income   +500   → acc1          (salary)
 *   tx2  2024-01-05  expense  −100   acc1 →          (groceries)
 *   tx3  2024-01-10  expense   −50   acc2 →          (coffee)
 *   tx4  2024-01-15  transfer +200   acc1 → acc2     (cash top-up)
 *   tx5  2024-01-20  expense  −300   acc3 →          (credit card charge)
 *   tx6  2024-02-01  income  +1000   → acc4          (investment return)
 *   tx7  2024-02-10  transfer +100   acc4 → acc1     (pull from investment)
 *   tx8  2024-02-15  expense   −75   acc1 →          (dinner)
 *
 * Expected balances (all-time):
 *   acc1: 1000 + 500 − 100 − 200 + 100 − 75 = 1225
 *   acc2: 200  − 50  + 200                   =  350
 *   acc3: 0    − 300                          = −300
 *   acc4: 5000 + 1000 − 100                  = 5900
 *   acc5: 500  (no transactions)             =  500
 */

import {
  txContribution,
  calculateAccountBalance,
  addRunningBalance,
} from "@/lib/balanceUtils";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const acc1 = { id: 1, name: "Main Bank",     type: "bank",       initial_balance: 1000 };
const acc2 = { id: 2, name: "Wallet Cash",   type: "cash",       initial_balance:  200 };
const acc3 = { id: 3, name: "Visa Credit",   type: "credit",     initial_balance:    0 };
const acc4 = { id: 4, name: "Investments",   type: "investment", initial_balance: 5000 };
const acc5 = { id: 5, name: "Euro Savings",  type: "bank",       initial_balance:  500 };
const acc6 = { id: 6, name: "ARS Account",   type: "bank",       initial_balance:    0 };

const tx1 = { id: 1, type: "income",   amount:  500,  source_account_id: null, target_account_id: 1, date: "2024-01-01" };
const tx2 = { id: 2, type: "expense",  amount: -100,  source_account_id: 1,    target_account_id: null, date: "2024-01-05" };
const tx3 = { id: 3, type: "expense",  amount:  -50,  source_account_id: 2,    target_account_id: null, date: "2024-01-10" };
const tx4 = { id: 4, type: "transfer", amount:  200,  source_account_id: 1,    target_account_id: 2,   date: "2024-01-15" };
const tx5 = { id: 5, type: "expense",  amount: -300,  source_account_id: 3,    target_account_id: null, date: "2024-01-20" };
const tx6 = { id: 6, type: "income",   amount: 1000,  source_account_id: null, target_account_id: 4,   date: "2024-02-01" };
const tx7 = { id: 7, type: "transfer", amount:  100,  source_account_id: 4,    target_account_id: 1,   date: "2024-02-10" };
const tx8 = { id: 8, type: "expense",  amount:  -75,  source_account_id: 1,    target_account_id: null, date: "2024-02-15" };

const allTx = [tx1, tx2, tx3, tx4, tx5, tx6, tx7, tx8];

// Cross-currency transfer fixtures (source_currency/target_currency mirror SQL JOIN results)
// USD→ARS: 100 USD at rate 1000 → ARS account should receive 100,000 ARS
const txXferUsdToArs = {
  id: 9, type: "transfer", amount: 100,
  source_account_id: 1, target_account_id: 6,
  source_currency: "USD", target_currency: "ARS",
  exchange_rate: 1000, date: "2024-03-01",
};
// ARS→USD: 50,000 ARS at rate 1000 → USD account should receive 50 USD
const txXferArsToUsd = {
  id: 10, type: "transfer", amount: 50000,
  source_account_id: 6, target_account_id: 1,
  source_currency: "ARS", target_currency: "USD",
  exchange_rate: 1000, date: "2024-03-05",
};

// ---------------------------------------------------------------------------
// txContribution
// ---------------------------------------------------------------------------

describe("txContribution", () => {
  test("income credits target account", () => {
    expect(txContribution(tx1, 1)).toBe(500);
  });

  test("income returns 0 for unrelated account", () => {
    expect(txContribution(tx1, 2)).toBe(0);
  });

  test("expense debits source account (negative amount flows through)", () => {
    expect(txContribution(tx2, 1)).toBe(-100);
  });

  test("expense returns 0 for unrelated account", () => {
    expect(txContribution(tx2, 2)).toBe(0);
  });

  test("transfer credits target account", () => {
    expect(txContribution(tx4, 2)).toBe(200);
  });

  test("transfer debits source account", () => {
    expect(txContribution(tx4, 1)).toBe(-200);
  });

  test("transfer returns 0 for unrelated account", () => {
    expect(txContribution(tx4, 3)).toBe(0);
  });

  test("credit card expense debits credit account", () => {
    expect(txContribution(tx5, 3)).toBe(-300);
  });

  test("investment transfer: debits investment account", () => {
    expect(txContribution(tx7, 4)).toBe(-100);
  });

  test("investment transfer: credits bank account", () => {
    expect(txContribution(tx7, 1)).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// txContribution — cross-currency transfers
// ---------------------------------------------------------------------------

describe("txContribution — cross-currency transfers", () => {
  test("USD→ARS: ARS target receives amount * exchange_rate", () => {
    expect(txContribution(txXferUsdToArs, 6)).toBe(100000); // 100 USD * 1000
  });

  test("USD→ARS: USD source is debited source amount", () => {
    expect(txContribution(txXferUsdToArs, 1)).toBe(-100);
  });

  test("ARS→USD: USD target receives amount / exchange_rate", () => {
    expect(txContribution(txXferArsToUsd, 1)).toBe(50); // 50000 ARS / 1000
  });

  test("ARS→USD: ARS source is debited source amount", () => {
    expect(txContribution(txXferArsToUsd, 6)).toBe(-50000);
  });

  test("calculateAccountBalance: ARS account after USD→ARS transfer", () => {
    expect(calculateAccountBalance(acc6.initial_balance, [txXferUsdToArs], 6)).toBe(100000);
  });

  test("calculateAccountBalance: ARS account after round-trip transfers nets correctly", () => {
    // +100,000 ARS from USD→ARS, then −50,000 ARS from ARS→USD, net = 50,000 ARS
    expect(calculateAccountBalance(acc6.initial_balance, [txXferUsdToArs, txXferArsToUsd], 6)).toBe(50000);
  });
});

// ---------------------------------------------------------------------------
// calculateAccountBalance
// ---------------------------------------------------------------------------

describe("calculateAccountBalance", () => {
  test("acc1 all-time balance is 1225", () => {
    expect(calculateAccountBalance(acc1.initial_balance, allTx, 1)).toBe(1225);
  });

  test("acc2 all-time balance is 350", () => {
    expect(calculateAccountBalance(acc2.initial_balance, allTx, 2)).toBe(350);
  });

  test("acc3 all-time balance is -300", () => {
    expect(calculateAccountBalance(acc3.initial_balance, allTx, 3)).toBe(-300);
  });

  test("acc4 all-time balance is 5900", () => {
    expect(calculateAccountBalance(acc4.initial_balance, allTx, 4)).toBe(5900);
  });

  test("acc5 with no transactions equals initial_balance", () => {
    expect(calculateAccountBalance(acc5.initial_balance, allTx, 5)).toBe(500);
  });

  test("upToDate cutoff excludes transactions on/after the cutoff date", () => {
    // acc1 up to 2024-01-15 (exclusive): initial 1000 + tx1(+500) + tx2(-100) = 1400
    expect(calculateAccountBalance(acc1.initial_balance, allTx, 1, "2024-01-15")).toBe(1400);
  });

  test("upToDate with date before any transactions returns initial_balance", () => {
    expect(calculateAccountBalance(acc1.initial_balance, allTx, 1, "2023-12-31")).toBe(1000);
  });

  test("upToDate includes transfer that happened before cutoff", () => {
    // acc2 up to 2024-02-01: initial 200 + tx3(-50) + tx4(+200) = 350
    expect(calculateAccountBalance(acc2.initial_balance, allTx, 2, "2024-02-01")).toBe(350);
  });
});

// ---------------------------------------------------------------------------
// addRunningBalance — single account view
// ---------------------------------------------------------------------------

describe("addRunningBalance (single account)", () => {
  // acc1 transactions in ascending order: tx1, tx2, tx4, tx7, tx8
  const acc1Tx = [tx1, tx2, tx4, tx7, tx8];

  test("first row balance = opening + first contribution", () => {
    const result = addRunningBalance(acc1Tx, 1000, 1);
    // opening 1000 + tx1(+500) = 1500
    expect(result[0].balance).toBe(1500);
  });

  test("running balance after transfer out is correct", () => {
    const result = addRunningBalance(acc1Tx, 1000, 1);
    // tx4 is index 2: 1500 + tx2(-100) = 1400, then tx4(-200) = 1200
    expect(result[2].balance).toBe(1200);
  });

  test("final balance matches calculateAccountBalance", () => {
    const result = addRunningBalance(acc1Tx, 1000, 1);
    const last = result[result.length - 1].balance;
    expect(last).toBe(calculateAccountBalance(acc1.initial_balance, acc1Tx, 1));
  });

  test("acc3 credit card: balance goes negative", () => {
    const result = addRunningBalance([tx5], 0, 3);
    expect(result[0].balance).toBe(-300);
  });

  test("acc2 with transfer in: balance increases", () => {
    const acc2Tx = [tx3, tx4]; // expense then transfer in
    const result = addRunningBalance(acc2Tx, 200, 2);
    // 200 + tx3(-50) = 150, then tx4(+200) = 350
    expect(result[0].balance).toBe(150);
    expect(result[1].balance).toBe(350);
  });
});

// ---------------------------------------------------------------------------
// addRunningBalance — all-accounts view (no accountId)
// ---------------------------------------------------------------------------

describe("addRunningBalance (all-accounts, no accountId)", () => {
  test("income adds to running total", () => {
    const result = addRunningBalance([tx1], 0, null);
    expect(result[0].balance).toBe(500);
  });

  test("expense (negative amount) reduces running total", () => {
    const result = addRunningBalance([tx1, tx2], 0, null);
    expect(result[1].balance).toBe(400);
  });

  test("transfers are skipped in all-accounts view", () => {
    const result = addRunningBalance([tx1, tx4], 0, null);
    // tx4 is transfer, should not change balance
    expect(result[1].balance).toBe(result[0].balance);
  });

  test("mixed transactions: opening balance + income + expenses, transfers skipped", () => {
    // tx1(+500), tx2(−100), tx3(−50), tx4(transfer, skip), tx6(+1000), tx8(−75)
    const filtered = [tx1, tx2, tx3, tx4, tx6, tx8];
    const result = addRunningBalance(filtered, 100, null);
    // 100 + 500 + (-100) + (-50) + 0 (transfer skip) + 1000 + (-75) = 1375
    expect(result[result.length - 1].balance).toBe(1375);
  });
});
