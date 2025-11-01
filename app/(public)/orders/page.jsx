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
import CustomSelect from "@/components/CustomSelect";
import { assets } from '@/assets/assets'
import Image from "next/image";

export default function Orders() {
  const { getToken } = useAuth();
  const { user, isLoaded } = useUser();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [ratingModal, setRatingModal] = useState(null);

  const statusOptions = [
    { value: 'ALL', label: 'All Orders' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'ORDER_PLACED', label: 'Confirmed' },
    { value: 'SHIPPED', label: 'Shipped' },
    { value: 'DELIVERED', label: 'Delivered' },
    { value: 'CANCELLED', label: 'Cancelled' }
  ];

  const router = useRouter();
  const dispatch = useDispatch();
  const { ratings } = useSelector(state => state.rating);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getToken();
        
        const [ordersResponse] = await Promise.all([
          axios.get("/api/orders", {
            headers: { Authorization: `Bearer ${token}` },
          }),
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

  // ✅ Filter logic update karo
  const filteredOrders = filterStatus === 'ALL'
    ? orders
    : orders.filter((order) => order.status?.toUpperCase() === filterStatus.toUpperCase());

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
            <div className="w-48"> {/* ✅ Fixed width for desktop */}
              <CustomSelect
                value={filterStatus}
                onChange={setFilterStatus}
                options={statusOptions}
              />
            </div>
          </div>

          {/* Mobile View - Original Design */}
          <div className="md:hidden mb-8">
            <PageTitle heading="My Orders" linkText={"Go to home"} />
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-4 p-4 bg-slate-50 rounded-lg">
              <p className="text-slate-600 font-medium">
                {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""} found
              </p>
              <div className="w-full sm:w-48"> {/* ✅ Responsive width for mobile */}
                <CustomSelect
                  value={filterStatus}
                  onChange={setFilterStatus}
                  options={statusOptions}
                />
              </div>
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
          <div className="mb-4">
    <Image className='w-35' src={assets.orderdelivery} alt="" />
  </div>
          <h1 className="text-2xl sm:text-4xl font-semibold mb-4 text-center">
            {filterStatus !== "ALL"
              ? `No orders found with status: ${filterStatus.replace("_", " ").toLowerCase()}`
              : "Start shopping to see your orders here"}
          </h1>
          <div className="flex gap-4">
            {filterStatus !== "ALL" && (
              <button
                onClick={() => setFilterStatus("ALL")}
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