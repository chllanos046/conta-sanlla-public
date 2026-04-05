/**
 * Balance calculation utilities.
 *
 * Amount sign convention:
 *   income   → amount is positive (+), target_account required, no source_account
 *   expense  → amount is negative (−), source_account required, no target_account
 *   transfer → amount is positive (+), both source and target required
 *              contributes +amount to target, -amount to source
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
    // income(+) and transfer(+) credit the target account
    return parseFloat(tx.amount);
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
    const cutoff = new Date(upToDate);
    filtered = transactions.filter((tx) => new Date(tx.date) < cutoff);
  }
  return filtered.reduce(
    (bal, tx) => bal + txContribution(tx, accountId),
    parseFloat(initialBalance) || 0
  );
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
