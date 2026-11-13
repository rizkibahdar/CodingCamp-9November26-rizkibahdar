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

// ============================================
// Render Total Spending
// ============================================

/**
 * Format a number as Indonesian Rupiah: Rp 150.000
 */
function formatIDR(amount) {
  return (
    'Rp ' +
    new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  );
}

/**
 * Calculate total and update the #total-amount element.
 */
function renderTotal() {
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  document.getElementById('total-amount').textContent = formatIDR(total);
}

// ============================================
// Render Transaction List
// ============================================

/**
 * Delete a transaction by ID, save, and re-render all UI.
 */
function deleteTransaction(id) {
  transactions = transactions.filter((t) => t.id !== id);
  saveTransactions(transactions);
  renderTotal();
  renderList();
  renderChart();
}

/**
 * Clear and re-render the transaction list.
 * Shows empty state when no transactions exist.
 */
function renderList() {
  const listEl = document.getElementById('list');
  const emptyState = document.getElementById('list-empty-state');

  // Clear existing rows
  listEl.innerHTML = '';

  if (transactions.length === 0) {
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  // Render one <li> per transaction (newest first)
  [...transactions].reverse().forEach((t) => {
    const li = document.createElement('li');
    li.className = 'transaction-item';

    const categoryClass = t.category.toLowerCase();

    li.innerHTML = `
      <div class="transaction-info">
        <span class="transaction-name">${escapeHTML(t.name)}</span>
        <span class="transaction-amount">${formatIDR(t.amount)}</span>
      </div>
      <span class="category-badge ${categoryClass}">${escapeHTML(t.category)}</span>
      <button class="delete-btn" data-id="${t.id}" aria-label="Delete ${escapeHTML(t.name)}">&#x1F5D1;</button>
    `;

    listEl.appendChild(li);
  });

  // Attach delete listeners
  listEl.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      deleteTransaction(Number(btn.dataset.id));
    });
  });
}

/**
 * Escape HTML special characters to prevent XSS.
 */
function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================
// Spending Distribution Chart
// ============================================

// Hold the Chart.js instance so we can destroy it before re-creating
let spendingChart = null;

const CATEGORY_COLORS = {
  Food: '#f59e0b',
  Transport: '#3b82f6',
  Fun: '#a855f7',
};

/**
 * Aggregate transaction amounts by category.
 * Returns an object: { Food: 0, Transport: 0, Fun: 0 }
 */
function getCategoryTotals() {
  const totals = { Food: 0, Transport: 0, Fun: 0 };
  transactions.forEach((t) => {
    if (totals[t.category] !== undefined) {
      totals[t.category] += t.amount;
    }
  });
  return totals;
}

/**
 * Render or update the pie chart.
 * Destroys the previous instance before creating a new one.
 * Shows empty state when no transactions exist.
 */
function renderChart() {
  const canvas = document.getElementById('spending-chart');
  const emptyState = document.getElementById('chart-empty-state');

  if (transactions.length === 0) {
    canvas.style.display = 'none';
    emptyState.style.display = 'block';

    // Destroy existing chart if present
    if (spendingChart) {
      spendingChart.destroy();
      spendingChart = null;
    }
    return;
  }

  canvas.style.display = 'block';
  emptyState.style.display = 'none';

  const totals = getCategoryTotals();

  // Only include categories that have spending
  const labels = [];
  const data = [];
  const colors = [];

  Object.entries(totals).forEach(([category, amount]) => {
    if (amount > 0) {
      labels.push(category);
      data.push(amount);
      colors.push(CATEGORY_COLORS[category]);
    }
  });

  // Destroy previous chart instance to avoid canvas reuse errors
  if (spendingChart) {
    spendingChart.destroy();
    spendingChart = null;
  }

  spendingChart = new Chart(canvas, {
    type: 'pie',
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderColor: '#ffffff',
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 16,
            font: { size: 13 },
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const value = context.parsed;
              return ' ' + context.label + ': ' + formatIDR(value);
            },
          },
        },
      },
    },
  });
}
