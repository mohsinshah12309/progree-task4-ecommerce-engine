# Task 4: Secure E-Commerce Engine with Checkout Sandbox

**Progree Full Stack Development Internship**  
**Author:** Mohsin Ali Shah  
**GitHub:** [@mohsinshah12309](https://github.com/mohsinshah12309)

---

## 📌 Objective
Architect an online store ecosystem featuring user state persistence and checkout pipelines, secure authentication with JSON Web Tokens (JWT) and hashed database credentials, persistent shopping cart state, and a payment sandbox checkout that decrements backend inventory levels atomically upon successful transactions.

---

## 🚀 Key Modules & Architecture

1. **Authentication & Credential Security:**
   - Password encryption using **bcryptjs** (salt factor 10).
   - Stateless session management using **JSON Web Tokens (JWT)**.
   - Protected checkout pipeline enforced by JWT bearer verification middleware.

2. **Persistent Shopping Cart State Engine:**
   - Client-side storage persistence across browser refreshes and sessions.
   - Real-time stock limit guards preventing users from adding more quantity than available in inventory.

3. **Secure Payment Sandbox Integration:**
   - End-to-end checkout pipeline simulating Stripe sandbox transactions.
   - Generates verifiable payment intent tokens (`pi_sandbox_...`).
   - Mock card verification with test numbers.

4. **Atomic Backend Inventory Adjustments:**
   - SQLite transactional execution (`BEGIN TRANSACTION` -> atomic stock decrement -> `COMMIT`).
   - Rejection and rollback if any item experiences concurrent out-of-stock conditions.
   - Returns refreshed real-time inventory counts to keep client state synchronized.

---

## 📡 REST API Specifications

| Method | Endpoint | Protection | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new user with hashed password & return JWT |
| `POST` | `/api/auth/login` | Public | Verify credentials & issue JWT token |
| `GET` | `/api/auth/me` | JWT | Get authenticated user profile |
| `GET` | `/api/products` | Public | Get catalog products with real-time stock counts |
| `POST` | `/api/checkout/sandbox`| JWT | Authorize sandbox payment & decrement stock atomically |
| `GET` | `/api/orders` | JWT | Retrieve customer order history |

---

## 📂 Project Structure
```text
progree-task4-ecommerce-engine/
├── public/
│   ├── index.html     # Storefront catalog, cart drawer & sandbox modal
│   ├── style.css      # E-commerce theme, responsive cart & checkout UI
│   └── app.js         # JWT auth, persistent cart state & checkout controller
├── server.js          # Express microservice, JWT verification & SQLite transactions
├── package.json       # Dependencies (express, cors, jsonwebtoken, bcryptjs)
├── ecommerce.db       # Persistent SQLite database (users, products, orders)
└── README.md          # Comprehensive documentation
```

---

## 💻 How to Run Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the application:**
   ```bash
   npm start
   ```

3. **Open in browser:**  
   Navigate to [http://localhost:5001](http://localhost:5001)
