"use client";
import PageTitle from "@/components/PageTitle";
import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import { useRouter } from "next/navigation";
import Loading from "@/components/Loading";
import { toast } from "react-hot-toast";
import OrderItem from "@/components/OrderItem";
import RatingModal from "@/components/RatingModal";
import { useDispatch, useSelector } from "react-redux";
import { fetchUserRating } from "@/lib/features/rating/ratingSlice";

export default function Orders() {
  const { getToken } = useAuth();
  const { user, isLoaded } = useUser();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [ratingModal, setRatingModal] = useState(null);

  const router = useRouter();
  const dispatch = useDispatch();
  const { ratings } = useSelector(state => state.rating);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getToken();
        
        // Fetch orders and ratings in parallel
        const [ordersResponse] = await Promise.all([
          axios.get("/api/orders", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          // Fetch ratings if not already loaded
          ratings.length === 0 ? dispatch(fetchUserRating({ getToken })).unwrap() : Promise.resolve()
        ]);

        setOrders(ordersResponse.data.orders);
        setLoading(false);
      } catch (error) {
        if (error?.response?.data?.error || error?.message) {
          toast.error(error?.response?.data?.error || error.message);
        }
        setLoading(false);
      }
    };

    if (isLoaded) {
      if (user) {
        fetchData();
      } else {
        router.push("/");
      }
    }
  }, [isLoaded, user, getToken, router, dispatch, ratings.length]);

  const filteredOrders = filter === "ALL"
    ? orders
    : orders.filter((order) => order.status?.toUpperCase() === filter.toUpperCase());

  const handleRateProduct = (orderId, productId) => {
    setRatingModal({ orderId, productId });
  };

  if (!isLoaded || loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-[70vh] mx-6">
      {filteredOrders.length > 0 ? (
        <div className="my-20 max-w-7xl mx-auto">
          {/* Desktop View - Compact */}
          <div className="max-md:hidden flex items-center justify-between mb-8">
            <div className="flex items-center gap-6">
              <PageTitle heading="My Orders" linkText={"Go to home"} />
              <p className="text-slate-600 font-medium text-sm">
                {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""} found
              </p>
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-700 cursor-pointer min-w-[140px]"
            >
              <option value="ALL">All Orders</option>
              <option value="PENDING">Pending</option>
              <option value="ORDER_PLACED">Confirmed</option>
              <option value="SHIPPED">Shipped</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Mobile View - Original Design */}
          <div className="md:hidden mb-8">
            <PageTitle heading="My Orders" linkText={"Go to home"} />
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-4 p-4 bg-slate-50 rounded-lg">
              <p className="text-slate-600 font-medium">
                {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""} found
              </p>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-700 cursor-pointer transition-all duration-200 hover:border-blue-500 shadow-sm font-medium"
              >
                <option value="ALL">📦 All Orders</option>
                <option value="PENDING">⏳ Pending</option>
                <option value="ORDER_PLACED">✅ Confirmed</option>
                <option value="SHIPPED">🚚 Shipped</option>
                <option value="DELIVERED">🎉 Delivered</option>
                <option value="CANCELLED">❌ Cancelled</option>
              </select>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="max-md:hidden">
            <table className="w-full max-w-5xl text-slate-600 table-auto border-separate border-spacing-y-6">
              <thead>
                <tr className="text-slate-700 bg-slate-50 rounded-lg">
                  <th className="text-left p-4 font-semibold">Product</th>
                  <th className="text-center p-4 font-semibold">Total Price</th>
                  <th className="text-left p-4 font-semibold">Address</th>
                  <th className="text-left p-4 font-semibold">Status</th>
                  <th className="text-left p-4 font-semibold">Rating</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <OrderItem 
                    key={order.id} 
                    order={order} 
                    isMobile={false}
                    onRateProduct={handleRateProduct}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden space-y-4">
            {filteredOrders.map((order) => (
              <OrderItem 
                key={order.id} 
                order={order} 
                isMobile={true}
                onRateProduct={handleRateProduct}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="min-h-[80vh] mx-6 flex flex-col items-center justify-center text-slate-400">
          <div className="text-6xl mb-4">📦</div>
          <h1 className="text-2xl sm:text-4xl font-semibold mb-4 text-center">
            {filter !== "ALL"
              ? `No orders found with status: ${filter.replace("_", " ").toLowerCase()}`
              : "Start shopping to see your orders here"}
          </h1>
          <div className="flex gap-4">
            {filter !== "ALL" && (
              <button
                onClick={() => setFilter("ALL")}
                className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors text-sm"
              >
                Show All Orders
              </button>
            )}
            <button
              onClick={() => router.push("/shop")}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm"
            >
              Start Shopping
            </button>
          </div>
        </div>
      )}

      {ratingModal && <RatingModal ratingModal={ratingModal} setRatingModal={setRatingModal} />}
    </div>
  );
}