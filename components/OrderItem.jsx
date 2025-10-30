'use client'
import Image from "next/image";
import { useSelector } from "react-redux";
import Rating from "./Rating";

const getStatusColor = (status) => {
  switch (status?.toUpperCase()) {
    case "ORDER_PLACED": return "bg-orange-100 text-orange-800 border border-orange-200";
    case "DELIVERED": return "bg-green-100 text-green-800 border border-green-200";
    case "CANCELLED": return "bg-red-100 text-red-800 border border-red-200";
    case "PENDING": return "bg-yellow-100 text-yellow-800 border border-yellow-200";
    case "CONFIRMED": return "bg-blue-100 text-blue-800 border border-blue-200";
    case "SHIPPED": return "bg-purple-100 text-purple-800 border border-purple-200";
    default: return "bg-gray-100 text-gray-800 border border-gray-200";
  }
};

const OrderItem = ({ order, isMobile = false, onRateProduct }) => {
  const { ratings } = useSelector(state => state.rating);

  const firstProduct = order.orderItems?.[0]?.product;
  const productImage = firstProduct?.images?.[0];
  const productId = firstProduct?.id;
  const existingRating = ratings?.find(rating => 
    order.id === rating.orderId && productId === rating.productId
  );

  const DesktopView = () => (
    <tr className="bg-white hover:bg-slate-50 transition-colors rounded-lg">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-20 aspect-square bg-slate-100 flex items-center justify-center rounded-md">
            {productImage ? (
              <Image
                className="h-14 w-auto"
                src={productImage}
                alt={firstProduct?.name || "Product"}
                width={50}
                height={50}
              />
            ) : (
              <div className="text-slate-400 text-2xl">📦</div>
            )}
          </div>
          <div>
            <p className="font-medium text-slate-900">
              {firstProduct?.name || "Product"}
            </p>
            <p className="text-sm text-slate-500">
              {order.orderItems.length} item{order.orderItems.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </td>
      <td className="text-center p-4">
        <span className="font-semibold text-slate-900">₹{order.total}</span>
      </td>
      <td className="p-4">
        <p className="font-medium text-slate-900">
          {order.address?.firstName} {order.address?.lastName}
        </p>
        <p className="text-sm text-slate-500 truncate max-w-[200px]">
          {order.address?.city}, {order.address?.state}
        </p>
      </td>
      <td className="p-4">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
          {order.status || "PENDING"}
        </span>
      </td>
      <td className="p-4">
        <div>
          {existingRating ? (
            <Rating value={existingRating.rating} />
          ) : (
            <button 
              onClick={() => onRateProduct(order.id, productId)} 
              className={`text-green-600 hover:bg-green-50 transition px-3 py-2 rounded-lg border border-green-200 text-sm font-medium ${order.status !== "DELIVERED" ? 'hidden' : 'block'}`}
            >
              Rate Product
            </button>
          )}
        </div>
      </td>
    </tr>
  );

  const MobileView = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-semibold text-slate-900">
             Order #{(order.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6)).toUpperCase()}
          </p>
          <p className="text-sm text-slate-500">
            {new Date(order.createdAt).toLocaleDateString()}
          </p>
        </div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
          {order.status || "PENDING"}
        </span>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex justify-between">
          <span className="text-slate-600">Total Amount:</span>
          <span className="font-semibold text-slate-900">₹{order.total}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Items:</span>
          <span className="text-slate-900">{order.orderItems.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Address:</span>
          <span className="text-slate-900 text-right max-w-[120px] truncate">
            {order.address?.city}, {order.address?.state}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden bg-slate-100">
          {productImage ? (
            <img
              src={productImage}
              alt={firstProduct?.name || "Product"}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xs">📦</span>
          )}
        </div>
        <span>
          {firstProduct?.name}
          {order.orderItems.length > 1 && ` +${order.orderItems.length - 1} more`}
        </span>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-200">
        {existingRating ? (
          <div className="flex items-center gap-2">
            <span className="text-slate-600 text-sm">Rating:</span>
            <Rating value={existingRating.rating} />
          </div>
        ) : (
          <button 
            onClick={() => onRateProduct(order.id, productId)} 
            className={`w-full text-green-600 hover:bg-green-50 transition px-3 py-2 rounded-lg border border-green-200 text-sm font-medium ${order.status !== "DELIVERED" ? 'hidden' : 'block'}`}
          >
            Rate This Product
          </button>
        )}
      </div>
    </div>
  );

  return isMobile ? <MobileView /> : <DesktopView />;
}

export default OrderItem;