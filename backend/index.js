const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Jwt = require("jsonwebtoken");

require("./db/config");
const User = require("./db/User");
const Product = require("./db/Product");
const Order = require("./db/Order");

const jwtKey = "e-comm";
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

const nodemailer = require("nodemailer");

app.use(express.json());
app.use(cors());

/* =====================================================
   📧 ZOHO EMAIL CONFIGURATION
===================================================== */

const transporter = nodemailer.createTransport({
    host: "smtppro.zoho.in",
    port: 465,
    secure: true,
    auth: {
        user: "twaghmode@xtsworld.in",
        pass: "JRd0Z4zr4AQY"
    }
});

const ADMIN_EMAIL = "twaghmode@xtsworld.in";  // change if needed

/* =====================================================
   📂 UPLOAD FOLDER SETUP
===================================================== */

const uploadPath = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

app.use("/uploads", express.static(uploadPath));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueName =
            Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueName + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

/* =====================================================
   🔐 TOKEN + ROLE MIDDLEWARE
===================================================== */

function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(403).json({ error: "Token required" });
    }

    const token = authHeader.split(" ")[1];

    Jwt.verify(token, jwtKey, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: "Invalid token" });
        }

        req.user = decoded.user;
        next();
    });
}

function verifyAdmin(req, res, next) {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
    }
    next();
}

/* =====================================================
   👤 AUTH ROUTES
===================================================== */

// REGISTER (Always Customer)
app.post("/register", upload.single("image"), async (req, res) => {
    try {

        const existingUser = await User.findOne({ email: req.body.email });

        if (existingUser) {
            return res.status(400).json({ error: "Email already exists" });
        }

        const user = new User({
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
            mobile: req.body.mobile || "",
            image: req.file ? req.file.filename : "",
            role: "customer"
        });

        const result = await user.save();

        /* ================= SEND ADMIN NOTIFICATION EMAIL ================= */

        try {

            await transporter.sendMail({
                from: "Mukta Online Store <twaghmode@xtsworld.in>",
                to: ADMIN_EMAIL,
                subject: "🆕 New Customer Registration",
                html: `
        <div style="font-family:Arial;padding:30px;background:#f4f6f8;">
            <div style="background:#ffffff;padding:25px;border-radius:10px;
                        box-shadow:0 4px 12px rgba(0,0,0,0.08);">

                <h2 style="margin-top:0;">New Customer Registered 🎉</h2>

                <p><strong>Name:</strong> ${result.name}</p>
                <p><strong>Email:</strong> ${result.email}</p>
                <p><strong>Mobile:</strong> ${result.mobile || "Not Provided"}</p>

                <hr style="margin:20px 0;" />

                <p style="font-size:13px;color:#777;">
                    Registration Time: ${new Date().toLocaleString()}
                </p>

            </div>
        </div>
        `
            });

            console.log("Admin notification email sent");

        } catch (adminEmailError) {
            console.log("Admin Email Failed:", adminEmailError.message);
        }

        /* ================= SEND WELCOME EMAIL ================= */

        try {
            await transporter.sendMail({
                from: "Mukta Online Store <twaghmode@xtsworld.in>",
                to: result.email,
                subject: "Welcome to Mukta Online Store 🛍️",
                html: `
        <div style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 6px 18px rgba(0,0,0,0.08);">
                            
                            <!-- Header -->
                            <tr>
                                <td style="background:#111827;padding:25px;text-align:center;color:#fff;">
                                    <h1 style="margin:0;">Mukta Online Store 🛍️</h1>
                                </td>
                            </tr>

                            <!-- Body -->
                            <tr>
                                <td style="padding:35px;">
                                    <h2 style="margin-top:0;color:#111;">Welcome ${result.name} 👋</h2>
                                    
                                    <p style="color:#555;font-size:15px;line-height:1.6;">
                                        Your account has been successfully created.
                                        We are excited to have you with us!
                                    </p>

                                    <div style="background:#f9fafb;padding:15px;border-radius:8px;margin:20px 0;">
                                        <p><strong>Email:</strong> ${result.email}</p>
                                        <p><strong>Mobile:</strong> ${result.mobile}</p>
                                    </div>

                                    <div style="text-align:center;margin:30px 0;">
                                        <a href="http://172.16.60.17:3001/shop"
                                           style="background:#111827;color:#fff;text-decoration:none;padding:12px 30px;border-radius:25px;font-weight:bold;">
                                           Start Shopping
                                        </a>
                                    </div>

                                    <p style="font-size:13px;color:#888;">
                                        Need help? Contact our support anytime.
                                    </p>
                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td style="background:#f3f4f6;padding:20px;text-align:center;font-size:12px;color:#777;">
                                    © ${new Date().getFullYear()} Mukta Online Store. All rights reserved.
                                </td>
                            </tr>

                        </table>
                    </td>
                </tr>
            </table>
        </div>
        `
            });

            console.log("Welcome email sent");

        } catch (emailError) {
            console.log("Welcome Email Failed:", emailError.message);
        }

        res.json(result);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ADMIN REGISTER (Only Admin App Uses This)
app.post("/admin-register", upload.single("image"), async (req, res) => {
    try {

        const existingUser = await User.findOne({ email: req.body.email });

        if (existingUser) {
            return res.status(400).json({ error: "Email already exists" });
        }

        const user = new User({
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
            mobile: req.body.mobile,
            image: req.file ? req.file.filename : "",
            role: "admin"   // 🔥 FORCE ADMIN
        });

        const result = await user.save();
        res.json(result);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// LOGIN
app.post("/login", async (req, res) => {
    try {

        const user = await User.findOne({
            email: req.body.email,
            password: req.body.password
        }).select("-password");

        if (!user) {
            return res.status(400).json({ error: "Invalid credentials" });
        }

        Jwt.sign(
            { user },
            jwtKey,
            { expiresIn: "1d" },
            (err, token) => {
                if (err) {
                    res.status(500).json({ error: "JWT error" });
                } else {
                    res.json({ user, auth: token });
                }
            }
        );

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* =====================================================
   👤 PROFILE
===================================================== */

app.get("/profile/:id", verifyToken, async (req, res) => {
    const user = await User.findById(req.params.id).select("-password");
    res.json(user);
});

/* =====================================================
   📦 ADMIN PRODUCT ROUTES
===================================================== */

// ADD PRODUCT (ADMIN ONLY)
app.post("/add-product",
    verifyToken,
    verifyAdmin,
    upload.array("images", 5),
    async (req, res) => {

        const imagePaths = req.files
            ? req.files.map(file => file.filename)
            : [];

        const product = new Product({
            name: req.body.name,
            price: req.body.price,
            category: req.body.category,
            company: req.body.company,
            userId: req.user._id,
            images: imagePaths
        });

        const result = await product.save();
        res.json(result);
    }
);

// GET ALL PRODUCTS (ADMIN)
app.get("/products", verifyToken, verifyAdmin, async (req, res) => {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
});

// UPDATE PRODUCT (ADMIN)
app.put("/product/:id",
    verifyToken,
    verifyAdmin,
    upload.array("images", 5),
    async (req, res) => {

        const updateData = {
            name: req.body.name,
            price: req.body.price,
            category: req.body.category,
            company: req.body.company,
        };

        if (req.files && req.files.length > 0) {
            updateData.images = req.files.map(file => file.filename);
        }

        const result = await Product.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true }
        );

        res.json(result);
    }
);

// GET SINGLE PRODUCT (ADMIN)
app.get("/product/:id",
    verifyToken,
    verifyAdmin,
    async (req, res) => {
        try {
            const product = await Product.findById(req.params.id);

            if (!product) {
                return res.status(404).json({ error: "Product not found" });
            }

            res.json(product);

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
);

// DELETE PRODUCT (ADMIN)
app.delete("/product/:id", verifyToken, verifyAdmin, async (req, res) => {
    const result = await Product.findByIdAndDelete(req.params.id);
    res.json(result);
});

/* =====================================================
   🌍 CUSTOMER PUBLIC ROUTES
===================================================== */

// SHOP PRODUCTS
app.get("/shop-products", async (req, res) => {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
});

// SINGLE PRODUCT
app.get("/shop-product/:id", async (req, res) => {
    const product = await Product.findById(req.params.id);
    res.json(product);
});

/* =====================================================
   🛒 ORDER ROUTES
===================================================== */

// CUSTOMER PLACE ORDER
app.post("/place-order", async (req, res) => {

    try {

        const orderId = "ORD-" + Date.now().toString().slice(-6);

        const order = new Order({
            orderId,
            ...req.body,
            status: "Pending"
        });

        const savedOrder = await order.save();

        try {

            let productRows = "";
            let subtotal = 0;

            savedOrder.products.forEach(item => {

                const total = item.price * item.quantity;
                subtotal += total;

                productRows += `
                <tr>
                    <td style="padding:8px;border:1px solid #ddd;">${item.name}</td>
                    <td style="padding:8px;border:1px solid #ddd;text-align:center;">${item.quantity}</td>
                    <td style="padding:8px;border:1px solid #ddd;text-align:right;">₹ ${item.price}</td>
                    <td style="padding:8px;border:1px solid #ddd;text-align:right;">₹ ${total}</td>
                </tr>
                `;
            });

            const gst = subtotal * 0.18;
            const grandTotal = subtotal + gst;

            /* ================= CUSTOMER MAIL ================= */

            await transporter.sendMail({
                from: "Mukta Online Store <twaghmode@xtsworld.in>",
                to: savedOrder.email,
                subject: `Order Confirmation - ${savedOrder.orderId} 🛒`,
                html: `
                <div style="font-family:Arial;padding:30px;">
                    <h2>Thank You for Your Order 🎉</h2>

                    <p><strong>Order ID:</strong> ${savedOrder.orderId}</p>
                    <p><strong>Status:</strong> ${savedOrder.status}</p>

                    <h3>Billing Address</h3>
                    <p>
                        ${savedOrder.billingAddress?.address || ""}<br/>
                        ${savedOrder.billingAddress?.city || ""}, 
                        ${savedOrder.billingAddress?.state || ""} - 
                        ${savedOrder.billingAddress?.pincode || ""}
                    </p>

                    <h3>Shipping Address</h3>
                    <p>
                        ${savedOrder.shippingAddress?.address || ""}<br/>
                        ${savedOrder.shippingAddress?.city || ""}, 
                        ${savedOrder.shippingAddress?.state || ""} - 
                        ${savedOrder.shippingAddress?.pincode || ""}
                    </p>

                    <h3>Products Ordered</h3>
                    <table width="100%" style="border-collapse:collapse;">
                        <tr style="background:#eee;">
                            <th style="padding:8px;border:1px solid #ddd;">Product</th>
                            <th style="padding:8px;border:1px solid #ddd;">Qty</th>
                            <th style="padding:8px;border:1px solid #ddd;">Price</th>
                            <th style="padding:8px;border:1px solid #ddd;">Total</th>
                        </tr>
                        ${productRows}
                    </table>

                    <div style="text-align:right;margin-top:20px;">
                        <p>Subtotal: ₹ ${subtotal}</p>
                        <p>GST (18%): ₹ ${gst.toFixed(2)}</p>
                        <h3>Grand Total: ₹ ${grandTotal.toFixed(2)}</h3>
                    </div>

                    <p style="margin-top:20px;color:#777;">
                        📄 Invoice will be sent after your order is delivered.
                    </p>
                </div>
                `
            });

            console.log("Customer confirmation sent");

            /* ================= ADMIN MAIL ================= */

            await transporter.sendMail({
                from: "Mukta Online Store <twaghmode@xtsworld.in>",
                to: ADMIN_EMAIL,
                subject: `🛒 New Order Received - ${savedOrder.orderId}`,
                html: `
               <div style="font-family:Arial;padding:30px;">
                    <h2>New Order Placed</h2>

                    <p><strong>Order ID:</strong> ${savedOrder.orderId}</p>
                    <p><strong>Status:</strong> ${savedOrder.status}</p>

                    <h3>Billing Address</h3>
                    <p>
                        ${savedOrder.billingAddress?.address || ""}<br/>
                        ${savedOrder.billingAddress?.city || ""}, 
                        ${savedOrder.billingAddress?.state || ""} - 
                        ${savedOrder.billingAddress?.pincode || ""}
                    </p>

                    <h3>Shipping Address</h3>
                    <p>
                        ${savedOrder.shippingAddress?.address || ""}<br/>
                        ${savedOrder.shippingAddress?.city || ""}, 
                        ${savedOrder.shippingAddress?.state || ""} - 
                        ${savedOrder.shippingAddress?.pincode || ""}
                    </p>

                    <h3>Products Ordered</h3>
                    <table width="100%" style="border-collapse:collapse;">
                        <tr style="background:#eee;">
                            <th style="padding:8px;border:1px solid #ddd;">Product</th>
                            <th style="padding:8px;border:1px solid #ddd;">Qty</th>
                            <th style="padding:8px;border:1px solid #ddd;">Price</th>
                            <th style="padding:8px;border:1px solid #ddd;">Total</th>
                        </tr>
                        ${productRows}
                    </table>

                    <div style="text-align:right;margin-top:20px;">
                        <p>Subtotal: ₹ ${subtotal}</p>
                        <p>GST (18%): ₹ ${gst.toFixed(2)}</p>
                        <h3>Grand Total: ₹ ${grandTotal.toFixed(2)}</h3>
                    </div>

                    <p style="margin-top:20px;color:#777;">
                        📄 Invoice will be sent after your order is delivered.
                    </p>
                </div>
                `
            });

            console.log("Admin order mail sent");

        } catch (mailError) {
            console.log("Mail error:", mailError.message);
        }

        res.status(201).json(savedOrder);

    } catch (error) {
        console.log("Order Error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// Cancel Order
app.put("/cancel-order/:id", verifyToken, async (req, res) => {
    try {

        const { reason } = req.body;

        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).send({ error: "Order not found" });
        }

        if (order.status === "Delivered") {
            return res.status(400).send({ error: "Cannot cancel delivered order" });
        }

        order.status = "Cancelled";
        order.cancelReason = reason || "No reason provided";
        order.cancelledAt = new Date();

        await order.save();

        /* ========= CUSTOMER MAIL ========= */

        await transporter.sendMail({
            from: "Mukta Online Store <twaghmode@xtsworld.in>",
            to: order.email,
            subject: `Order ${order.orderId} Cancelled`,
            html: `
                <h3>Your order has been cancelled</h3>
                <p><strong>Order ID:</strong> ${order.orderId}</p>
                <p><strong>Reason:</strong> ${order.cancelReason}</p>
                <p>Refund will be processed within 3-5 business days.</p>
            `
        });

        /* ========= ADMIN MAIL ========= */

        await transporter.sendMail({
            from: "Mukta Online Store <twaghmode@xtsworld.in>",
            to: ADMIN_EMAIL,
            subject: `⚠ Order Cancelled - ${order.orderId}`,
            html: `
                <h3>Order Cancelled</h3>
                <p><strong>Order ID:</strong> ${order.orderId}</p>
                <p><strong>Customer:</strong> ${order.customerName}</p>
                <p><strong>Reason:</strong> ${order.cancelReason}</p>
                <p>Please process refund.</p>
            `
        });

        res.send({ message: "Order cancelled successfully" });

    } catch (error) {
        res.status(500).send({ error: "Server error" });
    }
});

app.put("/update-order-address/:id", verifyToken, async (req, res) => {
    try {
        const { address } = req.body;

        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).send({ error: "Order not found" });
        }

        if (order.status !== "Pending") {
            return res.status(400).send({ error: "Address cannot be updated now" });
        }

        order.shippingAddress = address;
        await order.save();

        res.send({ message: "Address updated successfully" });

    } catch (error) {
        res.status(500).send({ error: "Server error" });
    }
});

// Customer tracking order
app.put("/confirm-order/:id", async (req, res) => {
    const order = await Order.findById(req.params.id);
    order.status = "Confirmed";
    await order.save();
    res.send({ message: "Order confirmed" });
});

// ADMIN VIEW ALL ORDERS
app.get("/orders", verifyToken, verifyAdmin, async (req, res) => {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
});

app.put("/order/:id", verifyToken, verifyAdmin, async (req, res) => {
    try {

        const { status } = req.body;

        const updateData = {
            status,
            $push: {
                statusHistory: {
                    status: status,
                    date: new Date()
                }
            }
        };

        if (status === "Confirmed") {
            updateData.confirmedAt = new Date();
        }

        if (status === "Shipped") {
            updateData.shippedAt = new Date();
            updateData.trackingId = "TRK-" + Date.now();
            updateData.estimatedDelivery =
                new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
        }

        if (status === "Delivered") {
            updateData.deliveredAt = new Date();
        }

        // ✅ UPDATE ORDER FIRST
        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({ error: "Order not found" });
        }

        /* =====================================================
           📧 SEND STATUS UPDATE EMAIL
        ===================================================== */

        try {

            if (status === "Shipped" || status === "Delivered") {

                await transporter.sendMail({
                    from: "Mukta Online Store <twaghmode@xtsworld.in>",
                    to: updatedOrder.email,
                    subject: `Your Order ${updatedOrder.orderId} is ${status} 🚚`,
                    html: `
                        <div style="font-family:Arial;padding:30px;">
                            <h2>Order Update 📦</h2>
                            <p>Hello ${updatedOrder.customerName},</p>
                            <p>Your order <strong>${updatedOrder.orderId}</strong>
                            is now <strong>${status}</strong>.</p>
                            ${status === "Shipped" ? `
                                <p><strong>Tracking ID:</strong> ${updatedOrder.trackingId}</p>
                                <p><strong>Estimated Delivery:</strong> 
                                    ${new Date(updatedOrder.estimatedDelivery).toDateString()}
                                </p>
                            ` : ""}
                        </div>
                    `
                });

                console.log("Status email sent");
            }

        } catch (emailError) {
            console.log("Status Email Failed:", emailError.message);
        }

        /* =====================================================
           🧾 SEND INVOICE WHEN DELIVERED
        ===================================================== */

        if (status === "Delivered") {

            try {

                const invoicePath = path.join(
                    __dirname,
                    `invoice-${updatedOrder.orderId}.pdf`
                );

                const doc = new PDFDocument({ size: "A4", margin: 40 });
                const stream = fs.createWriteStream(invoicePath);

                doc.pipe(stream);

                /* ================= HEADER ================= */

                doc.rect(0, 0, doc.page.width, 90).fill("#ffffff");

                const logoPath = path.join(__dirname, "assets", "e-commm.png");
                if (fs.existsSync(logoPath)) {
                    doc.image(logoPath, 40, 25, { width: 120 });
                }

                doc.fillColor("#00000")
                    .fontSize(26)
                    .text("INVOICE", 0, 35, { align: "right" });

                doc.fillColor("#000");
                let y = 120;

                /* ================= ORDER INFO ================= */

                doc.fontSize(12);
                doc.text(`Order ID: ${updatedOrder.orderId}`, 350, y);
                doc.text(`Date: ${new Date(updatedOrder.createdAt).toDateString()}`, 350, y + 18);
                doc.text(`Status: ${updatedOrder.status}`, 350, y + 36);

                /* ================= CUSTOMER ================= */

                doc.fontSize(16).text("Customer Details", 40, y);
                doc.fontSize(12);

                doc.text(`Name: ${updatedOrder.customerName}`, 40, y + 25);
                doc.text(`Email: ${updatedOrder.email}`, 40, y + 42);
                doc.text(`Mobile: ${updatedOrder.mobile}`, 40, y + 59);

                /* ================= ADDRESS FUNCTION ================= */

                const printAddress = (title, addr, x, yPos) => {
                    doc.fontSize(14).text(title, x, yPos);
                    doc.fontSize(12);

                    if (!addr) {
                        doc.text("N/A", x, yPos + 20);
                        return;
                    }

                    let lineY = yPos + 20;

                    if (addr.address) {
                        doc.text(addr.address, x, lineY);
                        lineY += 15;
                    }

                    doc.text(
                        `${addr.city || ""}, ${addr.state || ""} - ${addr.pincode || ""}`,
                        x,
                        lineY
                    );

                    lineY += 15;

                    if (addr.country) {
                        doc.text(addr.country, x, lineY);
                    }
                };

                y += 100;

                printAddress("Billing Address", updatedOrder.billingAddress, 40, y);
                printAddress("Shipping Address", updatedOrder.shippingAddress, 300, y);

                /* ================= PRODUCTS TABLE ================= */

                y += 120;

                doc.fontSize(16).text("Products", 40, y);
                y += 25;

                doc.fontSize(12);

                // Table Header
                doc.rect(40, y, 500, 20).fill("#e5e7eb");
                doc.fillColor("#000");
                doc.text("Product", 50, y + 5);
                doc.text("Qty", 320, y + 5);
                doc.text("Price", 360, y + 5);
                doc.text("Total", 430, y + 5);

                y += 30;

                let subtotal = 0;

                updatedOrder.products.forEach(item => {

                    const itemTotal = item.price * item.quantity;
                    subtotal += itemTotal;

                    const imgPath = item.images?.length > 0
                        ? path.join(__dirname, "uploads", item.images[0])
                        : null;

                    if (imgPath && fs.existsSync(imgPath)) {
                        try {
                            doc.image(imgPath, 50, y, {
                                width: 40,
                                height: 40
                            });
                        } catch (err) {
                            console.log("Image load error:", err.message);
                        }
                    }

                    doc.text(item.name, 100, y + 10, { width: 200 });
                    doc.text(item.quantity.toString(), 320, y + 10);
                    doc.text(`₹ ${item.price}`, 360, y + 10);
                    doc.text(`₹ ${itemTotal}`, 430, y + 10);

                    y += 60;
                });

                /* ================= TOTAL ================= */

                const gst = subtotal * 0.18;
                const grandTotal = subtotal + gst;

                y += 10;

                doc.fontSize(12);
                doc.text(`Subtotal: ₹ ${subtotal}`, 350, y);
                y += 18;
                doc.text(`GST (18%): ₹ ${gst.toFixed(2)}`, 350, y);
                y += 18;

                doc.fontSize(14)
                    .fillColor("#111827")
                    .text(`Grand Total: ₹ ${grandTotal.toFixed(2)}`, 350, y);

                /* ================= FOOTER ================= */

                doc.fontSize(10)
                    .fillColor("#777")
                    .text(
                        "Thank you for shopping with Mukta Online Store! ❤️",
                        0,
                        770,
                        { align: "center" }
                    );

                doc.end();

                // 🔥 WAIT FOR PDF TO FINISH
                await new Promise(resolve => stream.on("finish", resolve));

                await transporter.sendMail({
                    from: "Mukta Online Store <twaghmode@xtsworld.in>",
                    to: updatedOrder.email,
                    subject: `Invoice for Order ${updatedOrder.orderId}`,
                    html: `
                        <h2>Your Order Has Been Delivered 🎉</h2>
                        <p>Please find attached invoice.</p>
                    `,
                    attachments: [
                        {
                            filename: `invoice-${updatedOrder.orderId}.pdf`,
                            path: invoicePath
                        }
                    ]
                });

                console.log("Invoice email sent");

                fs.unlinkSync(invoicePath);

            } catch (err) {
                console.log("Invoice Email Failed:", err.message);
            }
        }

        res.json(updatedOrder);

    } catch (error) {
        console.error("ORDER UPDATE ERROR:", error);
        res.status(500).json({ error: error.message });
    }
});

// CUSTOMER ORDER HISTORY
app.get("/customer-orders/:userId", async (req, res) => {
    const orders = await Order.find({
        userId: req.params.userId
    }).sort({ createdAt: -1 });

    res.json(orders);
});

app.get("/invoice/:id", verifyToken, async (req, res) => {
    try {

        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        const doc = new PDFDocument({
            size: "A4",
            margin: 40
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=invoice-${order.orderId}.pdf`
        );

        doc.pipe(res);

        /* ================= LOAD FONT ================= */

        const fontPath = path.join(__dirname, "assets", "NotoSans-Regular.ttf");
        if (fs.existsSync(fontPath)) {
            doc.registerFont("Noto", fontPath);
            doc.font("Noto");
        }

        let y = 40;

        /* ================= HEADER ================= */

        doc.rect(0, 0, doc.page.width, 80).fill("#eef2ff");

        const logoPath = path.join(__dirname, "assets", "e-commm.png");

        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 40, 20, { width: 120 });
        }

        doc.fillColor("#000")
            .fontSize(26)
            .text("INVOICE", 0, 30, { align: "right" });

        y = 110;

        /* ================= ORDER INFO ================= */

        doc.fontSize(12);
        doc.text(`Order ID: ${order.orderId}`, 350, y);
        doc.text(`Date: ${new Date(order.createdAt).toDateString()}`, 350, y + 18);
        doc.text(`Status: ${order.status}`, 350, y + 36);

        /* ================= CUSTOMER ================= */

        doc.fontSize(14).text("Customer Details", 40, y);
        doc.fontSize(12);

        doc.text(`Name: ${order.customerName}`, 40, y + 25);
        doc.text(`Email: ${order.email}`, 40, y + 42);
        doc.text(`Mobile: ${order.mobile}`, 40, y + 59);

        /* ================= ADDRESS BLOCK FUNCTION ================= */

        const printAddress = (title, addr, x, yPos) => {

            doc.fontSize(14).text(title, x, yPos);
            doc.fontSize(12);

            if (!addr) {
                doc.text("N/A", x, yPos + 20);
                return;
            }

            let lineY = yPos + 20;

            if (addr.address) {
                doc.text(addr.address, x, lineY);
                lineY += 15;
            }

            doc.text(
                `${addr.city || ""}, ${addr.state || ""} - ${addr.pincode || ""}`,
                x,
                lineY
            );

            lineY += 15;

            if (addr.country) {
                doc.text(addr.country, x, lineY);
            }
        };

        y += 100;

        printAddress("Billing Address", order.billingAddress, 40, y);
        printAddress("Shipping Address", order.shippingAddress, 300, y);

        /* ================= PRODUCTS ================= */

        y += 100;

        doc.fontSize(14).text("Products", 40, y);
        y += 25;

        doc.fontSize(12);

        doc.text("Product", 40, y);
        doc.text("Qty", 300, y);
        doc.text("Price", 350, y);
        doc.text("Total", 430, y);

        y += 20;

        let subtotal = 0;

        order.products.forEach(item => {

            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;

            if (item.images?.length > 0) {
                const imgPath = path.join(__dirname, "uploads", item.images[0]);
                if (fs.existsSync(imgPath)) {
                    try {
                        doc.image(imgPath, 40, y, {
                            width: 35,
                            height: 35
                        });
                    } catch (err) {
                        console.log("Invalid image skipped:", imgPath);
                    };
                }
            }

            doc.text(item.name, 90, y, { width: 190 });
            doc.text(item.quantity.toString(), 300, y);
            doc.text(`₹ ${item.price}`, 350, y);
            doc.text(`₹ ${itemTotal}`, 430, y);

            y += 45;
        });

        /* ================= TOTAL ================= */

        const gst = subtotal * 0.18;
        const grandTotal = subtotal + gst;

        y += 10;

        doc.text(`Subtotal: ₹ ${subtotal}`, 350, y);
        y += 18;
        doc.text(`GST (18%): ₹ ${gst.toFixed(2)}`, 350, y);
        y += 18;

        doc.fontSize(14)
            .text(`Grand Total: ₹ ${grandTotal.toFixed(2)}`, 350, y);

        /* ================= QR ================= */

        const qrData = `Order ID: ${order.orderId}\nTotal: ₹ ${grandTotal}`;

        const qrImage = await QRCode.toDataURL(qrData);
        const qrBuffer = Buffer.from(
            qrImage.replace(/^data:image\/png;base64,/, ""),
            "base64"
        );

        try {
            doc.image(qrBuffer, 40, y + 30, { width: 80 });
        } catch (err) {
            console.log("QR image failed");
        }

        /* ================= SIGNATURE ================= */

        doc.fontSize(12)
            .text("Authorized Signature", 400, y + 40);

        doc.moveTo(400, y + 60)
            .lineTo(550, y + 60)
            .stroke();

        /* ================= FOOTER ================= */

        doc.fontSize(10)
            .fillColor("#777")
            .text(
                "Thank you for shopping with Mukta Online Store!",
                0,
                770,
                { align: "center" }
            );

        doc.end();

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

/* =====================================================
   🚀 START SERVER
===================================================== */

app.listen(5000, "0.0.0.0", () => {
    console.log("Server running on port 5000");
});
