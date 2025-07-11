const axios = require('axios');
const Payment = require('../models/paymentMonthly');
const User = require('../models/userModel');

// ✅ 1. Create Instamojo Payment
// exports.createPayment = async (req, res) => {
//   const { userId, amount, purpose } = req.body;

//   const user = await User.findById(userId);
//   if (!user) return res.status(404).json({ message: "User not found" });

//   try {
//     // const response = await axios.post("https://www.instamojo.com/api/1.1/payment-requests/", {
//     const response = await axios.post("https://www.instamojo.com/api/1.1/payments/${payment_id}/", {
   
//       purpose,
//       amount,
//       buyer_name: `${user.firstName} ${user.lastName}`,
//       email: user.email,
//       phone: user.phone,
//       redirect_url: `https://your-frontend.com/payment-success?userId=${userId}`
//     }, {
//       headers: {
//         "X-Api-Key": process.env.INSTAMOJO_API_KEY,
//         "X-Auth-Token": process.env.INSTAMOJO_AUTH_TOKEN
//       }
//     });

//     res.status(200).json({ paymentRequest: response.data.payment_request });

//   } catch (error) {
//     console.error("Instamojo error:", error.response?.data || error.message);
//     res.status(500).json({ message: "Failed to create payment request" });
//   }
// };

exports.createPayment = async (req, res) => {
  const { userId, amount, purpose } = req.body;

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: "User not found" });

    // ✅ Add debug logs here
  console.log("Using Instamojo Key:", process.env.INSTAMOJO_API_KEY);
  console.log("Using Auth Token:", process.env.INSTAMOJO_AUTH_TOKEN);
  
  try {
    const response = await axios.post("https://www.instamojo.com/api/1.1/payment-requests/", {
      purpose,
      amount,
      buyer_name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phone,
      redirect_url: `https://your-frontend.com/payment-success?userId=${userId}`
    }, {
      headers: {
        "X-Api-Key": process.env.INSTAMOJO_API_KEY,
        "X-Auth-Token": process.env.INSTAMOJO_AUTH_TOKEN
      }
    });

    res.status(200).json({ paymentRequest: response.data.payment_request });

  } catch (error) {
    console.error("Instamojo error:", error.response?.data || error.message);
    res.status(500).json({ message: "Failed to create payment request" });
  }
};


// ✅ 2. Verify and Update User Subscription
// ✅ 2. Verify and Update User Subscription
// exports.verifyPayment = async (req, res) => {
//   const { payment_id, payment_request_id, userId } = req.query;

//   try {
//     // const response = await axios.get(`https://www.instamojo.com/api/1.1/payments/${payment_id}/`, {
//     const response = await axios.get(`https://www.instamojo.com/api/1.1/payment-requests/`, {

//       headers: {
//         "X-Api-Key": process.env.INSTAMOJO_API_KEY,
//         "X-Auth-Token": process.env.INSTAMOJO_AUTH_TOKEN
//       }
//     });

//     const payment = response.data.payment;

//     if (payment.status === "Credit") {
//       // 1. Save payment in DB
//       await Payment.create({
//         userId,
//         paymentId: payment.payment_id,
//         paymentRequestId: payment_request_id,
//         status: payment.status,
//         amount: payment.amount,
//         method: payment.instrument_type,
//         purpose: payment.purpose,
//       });

//       // 2. Calculate new expiry date (30 days from now)
//       const newExpiry = new Date();
//       newExpiry.setDate(newExpiry.getDate() + 30);

//       // 3. Update user subscription status and log history
//       await User.findByIdAndUpdate(userId, {
//         subscriptionType: 'Paid',
//         paidUntil: newExpiry,
//         $push: {
//           subscriptionHistory: {
//             type: 'Paid',
//             startDate: new Date(),
//             endDate: newExpiry,
//           }
//         }
//       });

//       return res.status(200).json({ message: "✅ Payment verified. Subscription updated till 30 days." });
//     } else {
//       return res.status(400).json({ message: "❌ Payment failed or not completed." });
//     }

//   } catch (error) {
//     console.error("Verify payment error:", error.message);
//     res.status(500).json({ message: "Server error during payment verification." });
//   }
// };

exports.verifyPayment = async (req, res) => {
  const { payment_id, payment_request_id, userId } = req.query;

  try {
    const response = await axios.get(`https://www.instamojo.com/api/1.1/payments/${payment_id}/`, {
      headers: {
        "X-Api-Key": process.env.INSTAMOJO_API_KEY,
        "X-Auth-Token": process.env.INSTAMOJO_AUTH_TOKEN
      }
    });

    const payment = response.data.payment;

    if (payment.status === "Credit") {
      await Payment.create({
        userId,
        paymentId: payment.payment_id,
        paymentRequestId: payment_request_id,
        status: payment.status,
        amount: payment.amount,
        method: payment.instrument_type,
        purpose: payment.purpose,
      });

      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 30);

      await User.findByIdAndUpdate(userId, {
        subscriptionType: 'Paid',
        paidUntil: newExpiry,
        $push: {
          subscriptionHistory: {
            type: 'Paid',
            startDate: new Date(),
            endDate: newExpiry,
          }
        }
      });

      return res.status(200).json({ message: "✅ Payment verified. Subscription updated till 30 days." });
    } else {
      return res.status(400).json({ message: "❌ Payment failed or not completed." });
    }

  } catch (error) {
    console.error("Verify payment error:", error.response?.data || error.message);
    res.status(500).json({ message: "Server error during payment verification." });
  }
};


// ✅ 3. User Payment History
exports.getUserPayments = async (req, res) => {
  const payments = await Payment.find({ userId: req.params.userId }).sort({ createdAt: -1 });
  res.json({ payments });
};

// ✅ 4. Admin View of All Payments
exports.getAllPayments = async (req, res) => {
  const payments = await Payment.find().populate('userId').sort({ createdAt: -1 });
  res.json({ payments });
};
