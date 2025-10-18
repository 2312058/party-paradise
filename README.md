# 🎉 Party Paradise

A comprehensive event management platform connecting party hosts with service vendors in Tamil Nadu.

## 🌟 Features

- 🎈 **Event Management** - Create and manage events
- 🛠️ **Vendor Marketplace** - Browse and hire service vendors
- 💳 **Secure Payments** - Razorpay integration
- 💬 **Real-time Messaging** - Chat with vendors
- 📊 **Admin Dashboard** - Analytics and reports
- 📍 **Location-based** - Find vendors near you
- ⭐ **Reviews & Ratings** - Rate your experience
- 💰 **Earnings Tracking** - For vendors
- 🔄 **Automatic Refunds** - When events are cancelled

## 🚀 Tech Stack

### Frontend
- React.js
- React Router
- Axios
- Recharts (for analytics)
- CSS3

### Backend
- Node.js
- Express.js
- MongoDB
- JWT Authentication
- Razorpay Payment Gateway
- Nodemailer

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB
- Razorpay Account

### Local Setup

1. **Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/party-paradise.git
cd party-paradise
```

2. **Install backend dependencies**
```bash
cd backend
npm install
```

3. **Install frontend dependencies**
```bash
cd ../frontend
npm install
```

4. **Set up environment variables**

Create `backend/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/party-paradise
JWT_SECRET=your_jwt_secret_here
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

5. **Run the application**

Backend:
```bash
cd backend
npm run dev
```

Frontend:
```bash
cd frontend
npm start
```

6. **Access the application**
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## 👥 User Roles

### Party Hosts
- Create and manage events
- Browse vendors by service type
- Book vendors and make payments
- Track event status
- Message vendors

### Service Vendors
- Create service packages
- Manage bookings
- Accept/reject requests
- Track earnings
- Communicate with hosts

### Admin
- View all users and events
- Monitor platform analytics
- Manage disputes
- Generate reports

## 🔐 Security Features

- JWT-based authentication
- Password encryption
- Secure payment processing
- Email verification
- CORS protection

## 📱 Screenshots

_(Add screenshots here after deployment)_

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📄 License

MIT License

## 👨‍💻 Author

Your Name

## 📧 Contact

For queries: your.email@example.com