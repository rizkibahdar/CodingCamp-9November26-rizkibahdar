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

// ============================================
// Add Transaction
// ============================================

/**
 * Show an inline validation error for a field.
 */
function showError(errorId, inputEl, message) {
  const errorEl = document.getElementById(errorId);
  if (errorEl) errorEl.textContent = message;
  if (inputEl) inputEl.classList.add('input-error');
}

/**
 * Clear all inline validation errors.
 */
function clearErrors() {
  ['error-name', 'error-amount', 'error-category'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
  ['item-name', 'amount', 'category'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('input-error');
  });
}

/**
 * Handle form submission — validate, add transaction, update UI.
 */
function handleFormSubmit(event) {
  event.preventDefault();
  clearErrors();

  const nameInput = document.getElementById('item-name');
  const amountInput = document.getElementById('amount');
  const categoryInput = document.getElementById('category');

  const name = nameInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const category = categoryInput.value;

  // Validate
  let isValid = true;

  if (!name) {
    showError('error-name', nameInput, 'Item name is required.');
    isValid = false;
  }

  if (!amountInput.value.trim() || isNaN(amount) || amount <= 0) {
    showError('error-amount', amountInput, 'Amount must be greater than zero.');
    isValid = false;
  }

  if (!category) {
    showError('error-category', categoryInput, 'Please select a category.');
    isValid = false;
  }

  if (!isValid) return;

  // Build transaction object
  const transaction = {
    id: Date.now(),
    name,
    amount,
    category,
  };

  // Update state
  transactions.push(transaction);
  saveTransactions(transactions);

  // Clear form
  nameInput.value = '';
  amountInput.value = '';
  categoryInput.value = '';
  clearErrors();

  // Update UI
  renderTotal();
  renderList();
  renderChart();
}

// Attach form listener
document.getElementById('form').addEventListener('submit', handleFormSubmit);
