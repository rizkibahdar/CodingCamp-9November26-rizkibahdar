// Expense & Budget Visualizer - Application Logic

// ============================================
// Constants
// ============================================

const STORAGE_KEY = 'expense_transactions';

// ============================================
// Data Layer — Local Storage
// ============================================

/**
 * Load transactions from Local Storage.
 * Returns an empty array if no data exists or data is invalid.
 */
function loadTransactions() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

/**
 * Save transactions array to Local Storage.
 */
function saveTransactions(transactions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

// ============================================
// Application State
// ============================================

// In-memory transactions array, initialized from Local Storage on load
let transactions = loadTransactions();
