import React, { useEffect, useState } from "react";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Legend,
    Pie,
    Cell
} from "recharts";

const Dashboard = () => {

    const [orders, setOrders] = useState([]);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const auth = JSON.parse(localStorage.getItem("user"));

            const response = await fetch("http://172.16.60.17:5000/orders", {
                headers: {
                    Authorization: `Bearer ${auth.auth}`
                }
            });

            const data = await response.json();

            if (Array.isArray(data)) {
                setOrders(data);
            }

        } catch (error) {
            console.error("Error fetching dashboard data", error);
        }
    };

    /* ================= SUMMARY FIX ================= */

    // Income → All successful orders (money received)
    const totalIncome = orders
        .filter(o =>
            o.status === "Confirmed" ||
            o.status === "Shipped" ||
            o.status === "Delivered"
        )
        .reduce((acc, curr) => acc + curr.totalAmount, 0);

    // Revenue → Only delivered orders (final revenue)
    const totalRevenue = orders
        .filter(o => o.status === "Delivered")
        .reduce((acc, curr) => acc + curr.totalAmount, 0);

    // This Month Revenue
    const currentMonth = new Date().getMonth();

    const monthlyRevenue = orders
        .filter(o =>
            new Date(o.createdAt).getMonth() === currentMonth &&
            o.status === "Delivered"
        )
        .reduce((acc, curr) => acc + curr.totalAmount, 0);

    const totalOrders = orders.length;

    const summary = {
        income: totalIncome,
        orders: totalOrders,
        activity: totalOrders * 6,
        revenue: monthlyRevenue
    };

    /* ================= PIE DATA ================= */

    const countPending = orders.filter(o => o.status === "Pending").length;
    const countConfirmed = orders.filter(o => o.status === "Confirmed").length;
    const countShipped = orders.filter(o => o.status === "Shipped").length;
    const countDelivered = orders.filter(o => o.status === "Delivered").length;
    const countCancelled = orders.filter(o => o.status === "Cancelled").length;
    const countRefunded = orders.filter(o => o.status === "Refunded").length;

    const orderStatusData = [
        { name: "Pending", value: countPending },
        { name: "Confirmed", value: countConfirmed },
        { name: "Shipped", value: countShipped },
        { name: "Delivered", value: countDelivered },
        { name: "Cancelled", value: countCancelled },
        { name: "Refunded", value: countRefunded }
    ];

    const COLORS = [
        "#ffc107",
        "#17a2b8",
        "#007bff",
        "#28a745",
        "#dc3545",
        "#6c757d"
    ];

    /* ================= MONTHLY REVENUE ================= */

    const revenueData = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ].map((month, index) => {
        const monthRevenue = orders
            .filter(o => new Date(o.createdAt).getMonth() === index)
            .reduce((acc, curr) => acc + curr.totalAmount, 0);

        return { month, revenue: monthRevenue };
    });

    const salesData = revenueData.map(item => ({
        month: item.month,
        sales: orders.filter(o =>
            new Date(o.createdAt).toLocaleString('default', { month: 'short' }) === item.month
        ).length
    }));

    const latestOrders = orders.slice(0, 5);

    const getBadge = (status) => {
        const map = {
            Pending: "warning",
            Completed: "success",
            Cancelled: "danger",
            Refunded: "secondary",
            Confirmed: "info",
            Shipped: "primary",
            Delivered: "success"
        };
        return `badge bg-${map[status] || "secondary"} rounded-pill px-3 py-2`;
    };

    return (
        <div className="dashboard-wrapper py-5">
            <div className="container">

                <h3 className="dashboard-title">E-Commerce Dashboard</h3>

                {/* SUMMARY */}
                <div className="row g-4 mb-4">
                    <div className="col-md-6 col-lg-3">
                        <div className="card dashboard-card p-4">
                            <div className="card-title">Income</div>
                            <div className="card-value">₹{summary.income}</div>
                            <small className="text-success fw-semibold">Live Data</small>
                        </div>
                    </div>

                    <div className="col-md-6 col-lg-3">
                        <div className="card dashboard-card p-4">
                            <div className="card-title">Orders</div>
                            <div className="card-value">{summary.orders}</div>
                            <small className="text-muted">Total Orders</small>
                        </div>
                    </div>

                    <div className="col-md-6 col-lg-3">
                        <div className="card dashboard-card p-4">
                            <div className="card-title">Activity</div>
                            <div className="card-value">{summary.activity}</div>
                            <small className="text-muted">User Activity</small>
                        </div>
                    </div>

                    <div className="col-md-6 col-lg-3">
                        <div className="card dashboard-card p-4">
                            <div className="card-title">Revenue</div>
                            <div className="card-value">₹{summary.revenue}</div>
                            <small className="text-muted">Completed Orders</small>
                        </div>
                    </div>
                </div>

                {/* MAIN CHARTS */}
                <div className="row g-4 mb-4">

                    <div className="col-lg-8">
                        <div className="card dashboard-card chart-card">
                            <div className="chart-title">Total Revenue</div>
                            <ResponsiveContainer width="100%" height={320}>
                                <LineChart data={revenueData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" interval={0} />
                                    <YAxis />
                                    <Tooltip />
                                    <Line
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#4e73df"
                                        strokeWidth={3}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="col-lg-4">
                        <div className="card dashboard-card chart-card">
                            <div className="chart-title">Order Status</div>
                            <ResponsiveContainer width="100%" height={320}>
                                <PieChart>
                                    <Pie
                                        data={orderStatusData}
                                        dataKey="value"
                                        nameKey="name"
                                        outerRadius={95}
                                        innerRadius={50}
                                        paddingAngle={3}
                                    >
                                        {orderStatusData.map((entry, index) => (
                                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>

                {/* SALES + TABLE */}
                <div className="row g-4">

                    <div className="col-lg-4">
                        <div className="card shadow-sm border-0 rounded-4 p-4 h-100">
                            <h6 className="fw-bold mb-4">Sales / Revenue</h6>

                            <ResponsiveContainer width="100%" height={340}>
                                <BarChart
                                    data={salesData}
                                    margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />

                                    <XAxis
                                        dataKey="month"
                                        interval={0}
                                        angle={-35}
                                        textAnchor="end"
                                        height={60}
                                    />

                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="sales" fill="#4e73df" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="col-lg-8">
                        <div className="card dashboard-card p-4 h-100">
                            <div className="chart-title">Latest Orders</div>

                            <div className="table-responsive">
                                <table className="table table-hover align-middle">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Order ID</th>
                                            <th>Customer</th>
                                            <th>Total</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {latestOrders.slice(0, 10).map(order => (
                                            <tr key={order._id}>
                                                <td className="fw-semibold">#{order.orderId}</td>
                                                <td>{order.customerName}</td>
                                                <td className="fw-bold">₹{order.totalAmount}</td>
                                                <td>
                                                    <span className={getBadge(order.status)}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};

export default Dashboard;