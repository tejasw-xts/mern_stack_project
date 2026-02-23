const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({

    orderId: {
        type: String,
        unique: true,
        required: true,
        index: true
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
        index: true
    },

    customerName: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true
    },

    mobile: {
        type: String,
        required: true
    },

    billingAddress: {
        address: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
        country: { type: String, required: true }
    },

    shippingAddress: {
        address: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
        country: { type: String, required: true }
    },

    paymentMethod: {
        type: String,
        enum: ["COD", "Card"],
        default: "COD"
    },

    products: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "products"
            },
            name: { type: String, required: true },
            price: { type: Number, required: true },
            quantity: { type: Number, required: true },
            images: [String]
        }
    ],

    totalAmount: {
        type: Number,
        required: true
    },

    cancelReason: {
        type: String,
        default: ""
    },
    cancelledAt: {
        type: Date
    },

    status: {
        type: String,
        enum: [
            "Pending",
            "Confirmed",
            "Shipped",
            "OutForDelivery",
            "Delivered",
            "Cancelled",
            "Refunded"
        ],
        default: "Pending"
    },

    trackingId: {
        type: String,
        default: ""
    },

    statusHistory: {
        type: [
            {
                status: String,
                updatedAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ],
        default: []
    },

    confirmedAt: Date,
    shippedAt: Date,
    deliveredAt: Date,
    estimatedDelivery: Date,

    adminNotes: {
        type: String,
        default: ""
    },

    statusHistory: [
        {
            status: String,
            updatedAt: {
                type: Date,
                default: Date.now
            }
        }
    ]

}, { timestamps: true });

module.exports = mongoose.model("orders", orderSchema);
