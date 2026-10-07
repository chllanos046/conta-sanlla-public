import { convertAmount } from "@/lib/currency";

/**
 * Balance calculation utilities.
 *
 * Amount sign convention:
 *   income   → amount is positive (+) in target account's currency
 *   expense  → amount is negative (−) in source account's currency
 *   transfer → amount is positive (+) in source account's currency
 *              contributes +converted_amount to target, -amount to source
 */

/**
 * Returns the balance contribution of a single transaction to a given account.
 * Returns 0 if the transaction doesn't involve the account.
 *
 * @param {object} tx - Transaction object with type, amount, source_account_id, target_account_id
 * @param {number|string} accountId
 * @returns {number}
 */
export function txContribution(tx, accountId) {
  const id = String(accountId);
  if (String(tx.target_account_id) === id) {
    const amt = parseFloat(tx.amount);
    // Cross-currency transfer: amount is in source currency — convert to target currency
    if (
      tx.type === "transfer" &&
      tx.source_currency && tx.target_currency &&
      tx.source_currency !== tx.target_currency &&
      tx.exchange_rate
    ) {
      return convertAmount(amt, tx.source_currency, tx.target_currency, parseFloat(tx.exchange_rate));
    }
    return amt;
  }
  if (String(tx.source_account_id) === id) {
    if (tx.type === "expense") {
      // amount is already negative, adding it reduces the balance
      return parseFloat(tx.amount);
    }
    if (tx.type === "transfer") {
      // amount is positive, negate it to debit the source account
      return -parseFloat(tx.amount);
    }
  }
  return 0;
}

/**
 * Computes the balance for an account at a given point in time.
 *
 * @param {number} initialBalance - The account's initial_balance (opening snapshot)
 * @param {object[]} transactions - All transactions involving the account (any order)
 * @param {number|string} accountId
 * @param {string|Date|null} upToDate - If provided, only transactions strictly before this date are included (exclusive)
 * @returns {number}
 */
export function calculateAccountBalance(initialBalance, transactions, accountId, upToDate = null) {
  let filtered = transactions;
  if (upToDate) {
    const cutoff = String(upToDate).slice(0, 10);
    filtered = transactions.filter((tx) => String(tx.date).slice(0, 10) < cutoff);
  }
  return filtered.reduce(
    (bal, tx) => bal + txContribution(tx, accountId),
    parseFloat(initialBalance) || 0
  );
}

/**
 * Computes balances for multiple accounts in a single pass over `transactions`,
 * instead of re-scanning the full array once per account.
 *
 * @param {object[]} accounts - Accounts with `id` and `initial_balance`
 * @param {object[]} transactions - All transactions involving any of the accounts (any order)
 * @param {string|Date|null} upToDate - If provided, only transactions strictly before this date are included (exclusive)
 * @returns {Object.<string, number>} - Map of accountId (string) -> balance
 */
export function calculateAllAccountBalances(accounts, transactions, upToDate = null) {
  const balances = {};
  for (const acc of accounts) {
    balances[String(acc.id)] = parseFloat(acc.initial_balance) || 0;
  }

  let filtered = transactions;
  if (upToDate) {
    const cutoff = String(upToDate).slice(0, 10);
    filtered = transactions.filter((tx) => String(tx.date).slice(0, 10) < cutoff);
  }

  for (const tx of filtered) {
    const sourceId = String(tx.source_account_id);
    const targetId = String(tx.target_account_id);
    if (sourceId in balances) balances[sourceId] += txContribution(tx, sourceId);
    if (targetId in balances) balances[targetId] += txContribution(tx, targetId);
  }

  return balances;
}

/**
 * Adds a running `balance` field to each transaction row.
 *
 * Rows must be sorted ASCENDING by date before calling.
 * The last row will have the highest (most recent) balance.
 *
 * @param {object[]} transactions - Sorted ascending by date
 * @param {number} openingBalance - Balance before the first transaction in the list
 * @param {number|string|null} accountId - If provided, uses txContribution for each row.
 *   If null (all-accounts view), income and expense amounts are summed directly; transfers are skipped.
 * @returns {object[]} - Same rows with a `balance` field added
 */
export function addRunningBalance(transactions, openingBalance, accountId = null) {
  let running = parseFloat(openingBalance) || 0;
  return transactions.map((tx) => {
    let contribution;
    if (accountId !== null) {
      contribution = txContribution(tx, accountId);
    } else {
      // All-accounts view: income(+) and expense(−, already negative) count; transfers are skipped
      if (tx.type === "income") contribution = parseFloat(tx.amount);
      else if (tx.type === "expense") contribution = parseFloat(tx.amount);
      else contribution = 0;
    }
    running += contribution;
    return { ...tx, balance: running };
  });
}
