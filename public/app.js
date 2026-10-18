// State Management
const STATE = {
  user: JSON.parse(localStorage.getItem('nexus_user') || 'null'),
  token: localStorage.getItem('nexus_token') || null,
  cart: JSON.parse(localStorage.getItem('nexus_cart') || '[]'),
  products: []
};

// DOM Elements
const productGrid = document.getElementById('productGrid');
const cartCount = document.getElementById('cartCount');
const cartItemsList = document.getElementById('cartItemsList');
const cartSubtotal = document.getElementById('cartSubtotal');
const cartDrawerOverlay = document.getElementById('cartDrawerOverlay');
const btnOpenCart = document.getElementById('btnOpenCart');
const btnCloseCart = document.getElementById('btnCloseCart');
const authNavContainer = document.getElementById('authNavContainer');

// Modals
const authModal = document.getElementById('authModal');
const btnOpenAuth = document.getElementById('btnOpenAuth');
const btnCloseAuth = document.getElementById('btnCloseAuth');
const authForm = document.getElementById('authForm');
const authModalTitle = document.getElementById('authModalTitle');
const authError = document.getElementById('authError');
const groupName = document.getElementById('groupName');
const tabLogin = document.getElementById('tabLogin');
const tabRegister = document.getElementById('tabRegister');
const btnAuthSubmit = document.getElementById('btnAuthSubmit');

const checkoutModal = document.getElementById('checkoutModal');
const btnProceedCheckout = document.getElementById('btnProceedCheckout');
const btnCloseCheckout = document.getElementById('btnCloseCheckout');
const paymentForm = document.getElementById('paymentForm');
const checkoutItemsList = document.getElementById('checkoutItemsList');
const checkoutTotalAmount = document.getElementById('checkoutTotalAmount');
const btnAuthorizePayment = document.getElementById('btnAuthorizePayment');

const successModal = document.getElementById('successModal');
const receiptBox = document.getElementById('receiptBox');

let currentAuthMode = 'login'; // 'login' or 'register'

// Toast Notification
function showToast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// Save Cart Persistence
function saveCart() {
  localStorage.setItem('nexus_cart', JSON.stringify(STATE.cart));
  updateCartUI();
}

// Update Cart UI
function updateCartUI() {
  const totalItems = STATE.cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCount.innerText = totalItems;

  let totalAmount = 0;
  if (STATE.cart.length === 0) {
    cartItemsList.innerHTML = '<div style="text-align: center; color: #9ca3af; padding: 2rem 0;">Your cart is empty.</div>';
    cartSubtotal.innerText = '$0.00';
    return;
  }

  cartItemsList.innerHTML = '';
  STATE.cart.forEach(item => {
    totalAmount += item.price * item.quantity;
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <span style="font-size: 1.5rem;">${item.icon || '📦'}</span>
      <div class="cart-item-info">
        <div class="cart-item-title">${escapeHtml(item.name)}</div>
        <div class="cart-item-price">$${item.price.toFixed(2)} each</div>
      </div>
      <div class="cart-item-qty">
        <button class="qty-btn" onclick="modifyQty(${item.id}, -1)">-</button>
        <span style="font-size: 0.9rem; font-weight: 600;">${item.quantity}</span>
        <button class="qty-btn" onclick="modifyQty(${item.id}, 1)">+</button>
      </div>
    `;
    cartItemsList.appendChild(div);
  });

  cartSubtotal.innerText = `$${totalAmount.toFixed(2)}`;
}

// Modify Cart Quantity
window.modifyQty = function(id, delta) {
  const itemIndex = STATE.cart.findIndex(i => i.id === id);
  if (itemIndex > -1) {
    const item = STATE.cart[itemIndex];
    const product = STATE.products.find(p => p.id === id);

    if (delta > 0 && product && item.quantity >= product.stock) {
      showToast(`Cannot add more. Only ${product.stock} in stock.`, 'danger');
      return;
    }

    item.quantity += delta;
    if (item.quantity <= 0) {
      STATE.cart.splice(itemIndex, 1);
    }
    saveCart();
  }
};

// Add to Cart
window.addToCart = function(productId) {
  const product = STATE.products.find(p => p.id === productId);
  if (!product) return;

  if (product.stock <= 0) {
    showToast('Sorry, this product is currently out of stock.', 'danger');
    return;
  }

  const existing = STATE.cart.find(i => i.id === productId);
  if (existing) {
    if (existing.quantity >= product.stock) {
      showToast(`Cannot add more than ${product.stock} items (stock limit).`, 'danger');
      return;
    }
    existing.quantity += 1;
  } else {
    STATE.cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      icon: product.icon,
      quantity: 1
    });
  }

  saveCart();
  showToast(`Added "${product.name}" to cart!`);
};

// Fetch Product Catalog
async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    const data = await res.json();
    if (data.success) {
      STATE.products = data.products;
      renderProducts();
    }
  } catch (err) {
    productGrid.innerHTML = `<div style="color: #ef4444;">Error loading products: ${err.message}</div>`;
  }
}

// Render Products
function renderProducts() {
  productGrid.innerHTML = '';
  STATE.products.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';

    let stockTag = `<span class="stock-tag in-stock">${p.stock} in stock</span>`;
    let btnDisabled = '';
    if (p.stock === 0) {
      stockTag = '<span class="stock-tag out-of-stock">Out of stock</span>';
      btnDisabled = 'disabled style="opacity: 0.5; cursor: not-allowed;"';
    } else if (p.stock <= 3) {
      stockTag = `<span class="stock-tag low-stock">Only ${p.stock} left!</span>`;
    }

    card.innerHTML = `
      <div class="product-visual">${p.icon}</div>
      <div class="product-body">
        <span class="product-category">${escapeHtml(p.category)}</span>
        <h3 class="product-name">${escapeHtml(p.name)}</h3>
        <p class="product-desc">${escapeHtml(p.description)}</p>
        <div class="product-footer">
          <span class="product-price">$${p.price.toFixed(2)}</span>
          ${stockTag}
        </div>
        <button class="btn btn-primary btn-add-cart" ${btnDisabled} onclick="addToCart(${p.id})">
          ${p.stock > 0 ? '+ Add to Cart' : 'Sold Out'}
        </button>
      </div>
    `;
    productGrid.appendChild(card);
  });
}

// Render Navigation Auth state
function renderAuthNav() {
  if (STATE.user && STATE.token) {
    authNavContainer.innerHTML = `
      <div class="user-menu">
        <span>👤</span>
        <span class="user-name">${escapeHtml(STATE.user.name)}</span>
        <button class="btn-signout" onclick="signOut()">Sign Out</button>
      </div>
    `;
  } else {
    authNavContainer.innerHTML = `
      <button class="btn btn-outline" onclick="openAuthModal('login')">Sign In / Register</button>
    `;
  }
}

// Auth Modal Management
window.openAuthModal = function(mode = 'login') {
  switchAuthTab(mode);
  authModal.classList.add('open');
};

function switchAuthTab(mode) {
  currentAuthMode = mode;
  authError.innerText = '';
  if (mode === 'register') {
    authModalTitle.innerText = 'Create Account';
    groupName.style.display = 'flex';
    btnAuthSubmit.innerText = 'Register Account';
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
  } else {
    authModalTitle.innerText = 'Sign In';
    groupName.style.display = 'none';
    btnAuthSubmit.innerText = 'Sign In';
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
  }
}

btnCloseAuth?.addEventListener('click', () => authModal.classList.remove('open'));

// Auth Form Submit (Login / Register)
authForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.innerText = '';

  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const name = document.getElementById('authName').value.trim();

  const endpoint = currentAuthMode === 'register' ? '/api/auth/register' : '/api/auth/login';
  const payload = currentAuthMode === 'register' ? { name, email, password } : { email, password };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      STATE.user = data.user;
      STATE.token = data.token;
      localStorage.setItem('nexus_user', JSON.stringify(data.user));
      localStorage.setItem('nexus_token', data.token);

      renderAuthNav();
      authModal.classList.remove('open');
      showToast(data.message || 'Authenticated successfully!');
    } else {
      authError.innerText = data.error || 'Authentication failed.';
    }
  } catch (err) {
    authError.innerText = `Network error: ${err.message}`;
  }
});

// Sign Out
window.signOut = function() {
  STATE.user = null;
  STATE.token = null;
  localStorage.removeItem('nexus_user');
  localStorage.removeItem('nexus_token');
  renderAuthNav();
  showToast('You have signed out.');
};

// Cart Drawer open/close
btnOpenCart?.addEventListener('click', () => cartDrawerOverlay.classList.add('open'));
btnCloseCart?.addEventListener('click', () => cartDrawerOverlay.classList.remove('open'));
cartDrawerOverlay?.addEventListener('click', (e) => {
  if (e.target === cartDrawerOverlay) cartDrawerOverlay.classList.remove('open');
});

// Proceed to Checkout
btnProceedCheckout?.addEventListener('click', () => {
  if (STATE.cart.length === 0) {
    showToast('Your cart is empty!', 'danger');
    return;
  }

  if (!STATE.user || !STATE.token) {
    cartDrawerOverlay.classList.remove('open');
    openAuthModal('login');
    showToast('Please sign in or register to complete checkout.', 'danger');
    return;
  }

  // Populate summary
  cartDrawerOverlay.classList.remove('open');
  checkoutItemsList.innerHTML = '';
  let total = 0;
  STATE.cart.forEach(item => {
    const lineTotal = item.price * item.quantity;
    total += lineTotal;
    const line = document.createElement('div');
    line.className = 'checkout-item-line';
    line.innerHTML = `<span>${item.quantity}x ${escapeHtml(item.name)}</span><span>$${lineTotal.toFixed(2)}</span>`;
    checkoutItemsList.appendChild(line);
  });
  checkoutTotalAmount.innerText = `$${total.toFixed(2)}`;
  checkoutModal.classList.add('open');
});

btnCloseCheckout?.addEventListener('click', () => checkoutModal.classList.remove('open'));

// Payment Submit (Sandbox Stripe Authorization)
paymentForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  btnAuthorizePayment.disabled = true;
  btnAuthorizePayment.innerText = 'Authorizing with Stripe Sandbox...';

  try {
    const res = await fetch('/api/checkout/sandbox', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${STATE.token}`
      },
      body: JSON.stringify({
        items: STATE.cart.map(i => ({ id: i.id, quantity: i.quantity })),
        paymentMethod: 'stripe_mock_card'
      })
    });

    const data = await res.json();
    btnAuthorizePayment.disabled = false;
    btnAuthorizePayment.innerText = 'Authorize & Pay Sandbox Transaction';

    if (data.success) {
      checkoutModal.classList.remove('open');
      // Clear Cart
      STATE.cart = [];
      saveCart();

      // Update Catalog stock
      STATE.products = data.updatedProducts;
      renderProducts();

      // Show Receipt
      receiptBox.innerHTML = `
        <div><strong>Transaction ID:</strong> <code>${data.order.paymentIntentId}</code></div>
        <div><strong>Order ID:</strong> #${data.order.orderId}</div>
        <div><strong>Customer:</strong> ${escapeHtml(data.order.customer)}</div>
        <div><strong>Amount Paid:</strong> $${data.order.amount.toFixed(2)} USD</div>
        <div><strong>Inventory Status:</strong> Stocks updated atomically</div>
      `;
      successModal.classList.add('open');
      showToast('Order completed successfully!');
    } else {
      showToast(data.error || 'Checkout failed.', 'danger');
    }
  } catch (err) {
    btnAuthorizePayment.disabled = false;
    btnAuthorizePayment.innerText = 'Authorize & Pay Sandbox Transaction';
    showToast(`Network error: ${err.message}`, 'danger');
  }
});

window.closeSuccessModal = function() {
  successModal.classList.remove('open');
};

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}

// Initial Boot
document.addEventListener('DOMContentLoaded', () => {
  renderAuthNav();
  updateCartUI();
  loadProducts();
});
