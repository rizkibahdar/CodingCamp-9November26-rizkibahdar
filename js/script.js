// Expense & Budget Visualizer - Application Logic

// ============================================
// Constants
// ============================================

const STORAGE_KEY = 'expense_transactions';
const CATEGORIES_STORAGE_KEY = 'expense_categories';

// Default categories — always locked in, never deletable
const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Fun'];

// Default colors for the 3 locked-in categories
const DEFAULT_CATEGORY_COLORS = {
  Food: '#f59e0b',
  Transport: '#3b82f6',
  Fun: '#a855f7',
};

// Palette for auto-assigning colors to custom categories
const COLOR_PALETTE = [
  '#ef4444', // red
  '#10b981', // green
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#6366f1', // indigo
  '#84cc16', // lime
  '#06b6d4', // cyan
  '#e11d48', // rose
  '#8b5cf6', // violet
];

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

/**
 * Load custom categories from Local Storage.
 * Returns an empty array if no data exists or data is invalid.
 * Each entry: { name: string, color: string }
 */
function loadCustomCategories() {
  try {
    const stored = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

/**
 * Save custom categories array to Local Storage.
 */
function saveCustomCategories() {
  localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(customCategories));
}

// ============================================
// Application State
// ============================================

let transactions = loadTransactions();
let customCategories = loadCustomCategories();

// ============================================
// Category Helpers
// ============================================

/**
 * Return the full list of all categories (default + custom).
 */
function getAllCategories() {
  return [
    ...DEFAULT_CATEGORIES.map((name) => ({ name, color: DEFAULT_CATEGORY_COLORS[name] })),
    ...customCategories,
  ];
}

/**
 * Get color for a given category name.
 * Falls back to a neutral gray for orphaned categories.
 */
function getCategoryColor(name) {
  const all = getAllCategories();
  const found = all.find((c) => c.name === name);
  return found ? found.color : '#9ca3af';
}

/**
 * Auto-assign the next available color from the palette.
 * Cycles through the palette if all colors are used.
 */
function assignNextColor() {
  return COLOR_PALETTE[customCategories.length % COLOR_PALETTE.length];
}

// ============================================
// Category Management
// ============================================

/**
 * Add a new custom category.
 */
function addCategory() {
  const input = document.getElementById('new-category-input');
  const errorEl = document.getElementById('error-category-add');
  const name = input.value.trim();

  errorEl.textContent = '';
  input.classList.remove('input-error');

  if (!name) {
    errorEl.textContent = 'Category name cannot be empty.';
    input.classList.add('input-error');
    return;
  }

  // Check for duplicates (case-insensitive)
  const all = getAllCategories();
  const isDuplicate = all.some((c) => c.name.toLowerCase() === name.toLowerCase());
  if (isDuplicate) {
    errorEl.textContent = 'This category already exists.';
    input.classList.add('input-error');
    return;
  }

  const newCategory = { name, color: assignNextColor() };
  customCategories.push(newCategory);
  saveCustomCategories();

  input.value = '';

  renderCategoryList();
  renderCategoryOptions();
}

/**
 * Delete a custom category by name.
 * Existing transactions with this category are kept as-is.
 */
function deleteCategory(name) {
  customCategories = customCategories.filter((c) => c.name !== name);
  saveCustomCategories();
  renderCategoryList();
  renderCategoryOptions();
  renderChart(); // refresh chart in case the category had spending
}

/**
 * Render the category tag list in the Manage Categories section.
 * Default categories show a lock icon (not deletable).
 * Custom categories show a delete button.
 */
function renderCategoryList() {
  const container = document.getElementById('category-tag-list');
  container.innerHTML = '';

  getAllCategories().forEach(({ name, color }) => {
    const tag = document.createElement('span');
    tag.className = 'category-tag';
    tag.style.backgroundColor = color;

    const isDefault = DEFAULT_CATEGORIES.includes(name);

    tag.innerHTML = `
      <span class="category-tag-name">${escapeHTML(name)}</span>
      ${
        isDefault
          ? '<span class="category-tag-lock" aria-label="Default category">🔒</span>'
          : `<button class="category-tag-delete" data-name="${escapeHTML(name)}" aria-label="Delete ${escapeHTML(name)}">✕</button>`
      }
    `;

    container.appendChild(tag);
  });

  // Attach delete listeners for custom categories
  container.querySelectorAll('.category-tag-delete').forEach((btn) => {
    btn.addEventListener('click', () => {
      deleteCategory(btn.dataset.name);
    });
  });
}

/**
 * Populate the category <select> dropdown with all current categories.
 */
function renderCategoryOptions() {
  const select = document.getElementById('category');
  const currentValue = select.value;

  select.innerHTML = '<option value="">-- Select Category --</option>';

  getAllCategories().forEach(({ name }) => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });

  // Restore previously selected value if it still exists
  if (currentValue) select.value = currentValue;
}

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
 * Clear all inline validation errors on the expense form.
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

  const now = Date.now();
  const transaction = {
    id: now,
    name,
    amount,
    category,
    timestamp: now,
  };

  transactions.push(transaction);
  saveTransactions(transactions);

  nameInput.value = '';
  amountInput.value = '';
  categoryInput.value = '';
  clearErrors();

  renderTotal();
  renderList();
  renderChart();
}

document.getElementById('form').addEventListener('submit', handleFormSubmit);
document.getElementById('add-category-btn').addEventListener('click', addCategory);

// Allow pressing Enter in the category input to add
document.getElementById('new-category-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addCategory();
  }
});

// ============================================
// Render Total Spending
// ============================================

/**
 * Format a timestamp (ms) as: "13 Nov 2026, 14:35"
 * Returns "—" for missing or invalid timestamps.
 */
function formatTimestamp(ts) {
  if (!ts) return '—';
  try {
    const date = new Date(ts);
    const day = date.getDate();
    const month = date.toLocaleString('en-GB', { month: 'short' });
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}:${minutes}`;
  } catch (e) {
    return '—';
  }
}

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

  listEl.innerHTML = '';

  if (transactions.length === 0) {
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  [...transactions].reverse().forEach((t) => {
    const li = document.createElement('li');
    li.className = 'transaction-item';

    const badgeColor = getCategoryColor(t.category);

    li.innerHTML = `
      <div class="transaction-info">
        <span class="transaction-name">${escapeHTML(t.name)}</span>
        <span class="transaction-amount">${formatIDR(t.amount)}</span>
        <span class="transaction-timestamp">${formatTimestamp(t.timestamp)}</span>
      </div>
      <span class="category-badge" style="background-color:${badgeColor}">${escapeHTML(t.category)}</span>
      <button class="delete-btn" data-id="${t.id}" aria-label="Delete ${escapeHTML(t.name)}">&#x1F5D1;</button>
    `;

    listEl.appendChild(li);
  });

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

let spendingChart = null;

/**
 * Aggregate transaction amounts by category (all categories, dynamic).
 */
function getCategoryTotals() {
  const totals = {};
  transactions.forEach((t) => {
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  });
  return totals;
}

/**
 * Render or update the pie chart using dynamic category colors.
 */
function renderChart() {
  const canvas = document.getElementById('spending-chart');
  const emptyState = document.getElementById('chart-empty-state');

  if (transactions.length === 0) {
    canvas.style.display = 'none';
    emptyState.style.display = 'block';
    if (spendingChart) {
      spendingChart.destroy();
      spendingChart = null;
    }
    return;
  }

  canvas.style.display = 'block';
  emptyState.style.display = 'none';

  const totals = getCategoryTotals();
  const labels = [];
  const data = [];
  const colors = [];

  Object.entries(totals).forEach(([category, amount]) => {
    if (amount > 0) {
      labels.push(category);
      data.push(amount);
      colors.push(getCategoryColor(category));
    }
  });

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
              return ' ' + context.label + ': ' + formatIDR(context.parsed);
            },
          },
        },
      },
    },
  });
}

// ============================================
// Initialization — Run on page load
// ============================================

function init() {
  renderCategoryList();
  renderCategoryOptions();
  renderTotal();
  renderList();
  renderChart();
}

init();
