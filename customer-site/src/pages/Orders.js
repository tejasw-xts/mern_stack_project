import React, { useEffect, useState } from "react";

const Orders = () => {

    const [orders, setOrders] = useState([]);
    const user = JSON.parse(localStorage.getItem("user"));
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [newAddress, setNewAddress] = useState({
        address: "",
        city: "",
        state: "",
        pincode: ""
    });

    useEffect(() => {
        if (user) fetchOrders();
    }, []);

    const fetchOrders = async () => {
        const res = await fetch(
            `http://172.16.60.17:5000/customer-orders/${user._id}`
        );
        const data = await res.json();
        if (Array.isArray(data)) setOrders(data);
    };

    const getStatusColor = (status) => {
        const map = {
            Pending: "#ffb703",
            Confirmed: "#17a2b8",
            Shipped: "#007bff",
            OutForDelivery: "#6610f2",
            Delivered: "#2ecc71",
            Cancelled: "#e63946",
            Refunded: "#6c757d"
        };
        return map[status] || "#999";
    };

    const openAddressModal = (order) => {
        setSelectedOrder(order);
        setNewAddress(order.shippingAddress || {
            address: "",
            city: "",
            state: "",
            pincode: ""
        });
    };

    const getProgressStep = (status) => {
        switch (status) {
            case "Pending":
                return 0;
            case "Confirmed":
                return 1;
            case "Shipped":
                return 2;
            case "OutForDelivery":
                return 3;
            case "Delivered":
                return 4;
            default:
                return 0;
        }
    };

    const cancelOrder = async (id) => {

        const reason = window.prompt("Please enter cancellation reason:");

        if (!reason) {
            alert("Cancellation reason is required");
            return;
        }

        const token = localStorage.getItem("token");

        const response = await fetch(
            `http://172.16.60.17:5000/cancel-order/${id}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ reason })
            }
        );

        const data = await response.json();

        if (response.ok) {
            alert("Order cancelled successfully");
            fetchOrders();   // better than reload
        } else {
            alert(data.error || "Cancellation failed");
        }
    };

    const updateAddress = async () => {
        try {
            const token = localStorage.getItem("token");

            const res = await fetch(
                `http://172.16.60.17:5000/update-order-address/${selectedOrder._id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        address: newAddress
                    })
                }
            );

            const data = await res.json();

            if (res.ok) {
                alert("Address updated successfully");
                setSelectedOrder(null);
                fetchOrders();
            } else {
                alert(data.error);
            }

        } catch (error) {
            console.error(error);
        }
    };

    // ✅ REAL PDF DOWNLOAD FUNCTION
    const downloadInvoice = async (order) => {
        try {

            const token = localStorage.getItem("token");

            const response = await fetch(
                `http://172.16.60.17:5000/invoice/${order._id}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                alert("Failed to download invoice");
                return;
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = `invoice-${order.orderId}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();

        } catch (error) {
            console.error("Invoice error:", error);
            alert("Invoice download failed");
        }
    };

    return (
        <div style={{ background: "#ffffff", minHeight: "100vh" }}>
            <div className="container py-5">

                {/* HEADER */}
                <div className="mb-5">
                    <h2 className="fw-bold">My Orders</h2>
                    <p className="text-muted">
                        Track and manage your purchases
                    </p>
                </div>

                {orders.length === 0 && (
                    <div className="text-center py-5">
                        <h5>No Orders Found</h5>
                    </div>
                )}

                {orders.map(order => {

                    const progress = getProgressStep(order.status);

                    return (
                        <div
                            key={order._id}
                            className="mb-4 p-4 rounded-4"
                            style={{
                                background: "#fff",
                                boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
                            }}
                        >

                            {/* ORDER HEADER */}
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="fw-bold mb-1">
                                        Order ID: {order.orderId}
                                    </h6>
                                    <small className="text-muted">
                                        {new Date(order.createdAt).toLocaleDateString()}
                                    </small>
                                </div>

                                <div
                                    style={{
                                        background: getStatusColor(order.status),
                                        color: "#fff",
                                        padding: "6px 18px",
                                        borderRadius: "50px",
                                        fontSize: "0.85rem",
                                        fontWeight: "600"
                                    }}
                                >
                                    {order.status}
                                </div>
                            </div>

                            {/* 🚚 TRACKING BAR */}
                            <div className="mt-4 mb-4 position-relative">

                                <div
                                    style={{
                                        height: "6px",
                                        background: "#e5e7eb",
                                        borderRadius: "20px",
                                        position: "relative",
                                        overflow: "hidden"
                                    }}
                                >
                                    {/* Progress Fill */}
                                    <div
                                        style={{
                                            width: `${(progress / 4) * 100}%`,
                                            height: "100%",
                                            background: "linear-gradient(90deg,#4f46e5,#6366f1)",
                                            transition: "width 0.6s ease"
                                        }}
                                    />

                                    {/* 🚚 Moving Truck */}
                                    {progress > 0 && (
                                        <div
                                            style={{
                                                position: "absolute",
                                                top: "-18px",
                                                left: `calc(${(progress / 4) * 100}% - 20px)`,
                                                fontSize: "22px",
                                                transition: "left 0.6s ease"
                                            }}
                                        >
                                            🚚
                                        </div>
                                    )}
                                </div>

                                {/* Status Labels */}
                                <div className="d-flex justify-content-between mt-3">
                                    {["Pending", "Confirmed", "Shipped", "Out", "Delivered"].map((step, i) => (
                                        <small
                                            key={i}
                                            style={{
                                                fontWeight: progress >= i ? "600" : "400",
                                                color: progress >= i ? "#4f46e5" : "#6b7280"
                                            }}
                                        >
                                            {step}
                                        </small>
                                    ))}
                                </div>
                            </div>

                            <hr />

                            {/* PRODUCTS */}
                            {order.products.map((item, index) => (
                                <div
                                    key={index}
                                    className="d-flex justify-content-between align-items-center mb-4"
                                >
                                    <div className="d-flex align-items-center gap-4">

                                        <div
                                            style={{
                                                background: "#f8f9fa",
                                                padding: "12px",
                                                borderRadius: "12px"
                                            }}
                                        >
                                            <img
                                                src={`http://172.16.60.17:5000/uploads/${item.images?.[0]}`}
                                                alt={item.name}
                                                style={{
                                                    width: "70px",
                                                    height: "70px",
                                                    objectFit: "contain"
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <div className="fw-semibold">
                                                {item.name}
                                            </div>
                                            <small className="text-muted">
                                                Qty: {item.quantity}
                                            </small>
                                        </div>

                                    </div>

                                    <div className="fw-bold fs-5">
                                        ₹{item.price * item.quantity}
                                    </div>
                                </div>
                            ))}

                            {/* TOTAL + ACTIONS */}
                            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                                <div className="fw-bold fs-5">
                                    Total: ₹{order.totalAmount}
                                </div>

                                <div className="d-flex gap-2">

                                    {order.status === "Delivered" && (
                                        <button
                                            className="btn btn-outline-primary btn-sm rounded-pill px-4"
                                            onClick={() => downloadInvoice(order)}
                                        >
                                            Download Invoice
                                        </button>
                                    )}

                                    {order.status !== "Delivered" && order.status !== "Refunded" && (
                                        <button
                                            className="btn btn-outline-secondary btn-sm rounded-pill px-4"
                                            onClick={() => openAddressModal(order)}
                                        >
                                            Edit Address
                                        </button>
                                    )}

                                    {order.status !== "Delivered" && order.status !== "Refunded" && (
                                        <button
                                            className="btn btn-outline-danger btn-sm rounded-pill px-4"
                                            onClick={() => cancelOrder(order._id)}
                                        >
                                            Cancel
                                        </button>
                                    )}

                                </div>
                            </div>

                            {/* DELIVERY INFO */}
                            {order.shippedAt && (
                                <>
                                    <div
                                        className="mt-4 p-3 rounded-4"
                                        style={{
                                            background: "linear-gradient(135deg,#eef2ff,#f8fafc)",
                                            border: "1px solid #e5e7eb"
                                        }}
                                    >
                                        <div className="d-flex justify-content-between flex-wrap">

                                            <div>
                                                <small className="text-muted d-block">
                                                    🚚 Shipped On
                                                </small>
                                                <div className="fw-semibold">
                                                    {new Date(order.shippedAt).toLocaleDateString()}
                                                </div>
                                            </div>

                                            <div>
                                                <small className="text-muted d-block">
                                                    📦 Estimated Delivery
                                                </small>
                                                <div className="fw-semibold text-success">
                                                    {new Date(order.estimatedDelivery).toLocaleDateString()}
                                                </div>
                                            </div>

                                            <div>
                                                {order.trackingId && (
                                                    <div className="mt-2">
                                                        <small className="text-muted">Tracking ID</small>
                                                        <div className="fw-semibold text-primary">
                                                            {order.trackingId}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}

            </div>

            {/* ADDRESS MODAL */}
            {selectedOrder && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.6)",
                        backdropFilter: "blur(6px)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 9999,
                        animation: "fadeIn 0.3s ease"
                    }}
                >
                    <div
                        style={{
                            background: "linear-gradient(145deg, #ffffff, #f8f9ff)",
                            padding: "35px",
                            borderRadius: "20px",
                            width: "450px",
                            maxWidth: "95%",
                            boxShadow: "0 25px 60px rgba(0,0,0,0.2)",
                            animation: "slideUp 0.3s ease"
                        }}
                    >
                        <h4
                            style={{
                                fontWeight: "600",
                                marginBottom: "20px",
                                color: "#1e293b"
                            }}
                        >
                            ✏️ Edit Shipping Address
                        </h4>

                        {/* Address */}
                        <textarea
                            className="form-control mb-3"
                            placeholder="Street Address"
                            style={{
                                borderRadius: "12px",
                                padding: "12px",
                                border: "1px solid #e2e8f0"
                            }}
                            value={newAddress.address}
                            onChange={(e) =>
                                setNewAddress({ ...newAddress, address: e.target.value })
                            }
                        />

                        {/* City */}
                        <input
                            className="form-control mb-3"
                            placeholder="City"
                            style={{
                                borderRadius: "12px",
                                padding: "12px",
                                border: "1px solid #e2e8f0"
                            }}
                            value={newAddress.city}
                            onChange={(e) =>
                                setNewAddress({ ...newAddress, city: e.target.value })
                            }
                        />

                        {/* State */}
                        <input
                            className="form-control mb-3"
                            placeholder="State"
                            style={{
                                borderRadius: "12px",
                                padding: "12px",
                                border: "1px solid #e2e8f0"
                            }}
                            value={newAddress.state}
                            onChange={(e) =>
                                setNewAddress({ ...newAddress, state: e.target.value })
                            }
                        />

                        {/* Pincode */}
                        <input
                            className="form-control mb-4"
                            placeholder="Pincode"
                            style={{
                                borderRadius: "12px",
                                padding: "12px",
                                border: "1px solid #e2e8f0"
                            }}
                            value={newAddress.pincode}
                            onChange={(e) =>
                                setNewAddress({ ...newAddress, pincode: e.target.value })
                            }
                        />

                        <div className="d-flex justify-content-end gap-3">
                            <button
                                onClick={() => setSelectedOrder(null)}
                                style={{
                                    background: "#e2e8f0",
                                    border: "none",
                                    padding: "10px 20px",
                                    borderRadius: "30px",
                                    fontWeight: "500"
                                }}
                            >
                                Cancel
                            </button>

                            <button
                                onClick={updateAddress}
                                style={{
                                    background: "linear-gradient(135deg, #4f46e5, #6366f1)",
                                    color: "#fff",
                                    border: "none",
                                    padding: "10px 24px",
                                    borderRadius: "30px",
                                    fontWeight: "600",
                                    boxShadow: "0 8px 20px rgba(99,102,241,0.4)",
                                    transition: "0.3s"
                                }}
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>

                    {/* Animation Styles */}
                    <style>
                        {`
                            @keyframes fadeIn {
                                from { opacity: 0; }
                                to { opacity: 1; }
                            }
                            @keyframes slideUp {
                                from { transform: translateY(30px); opacity: 0; }
                                to { transform: translateY(0); opacity: 1; }
                            }
                            `}
                    </style>
                </div>
            )}
        </div>
    );
};

export default Orders;
