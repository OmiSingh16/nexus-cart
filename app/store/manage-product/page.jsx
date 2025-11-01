"use client";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import Image from "next/image";
import Loading from "@/components/Loading";
import { useAuth, useUser } from "@clerk/clerk-react";
import axios from "axios";
import { Trash2Icon } from "lucide-react";

export default function StoreManageProducts() {
  const { getToken } = useAuth();
  const { user } = useUser();

  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "₹";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingProducts, setUpdatingProducts] = useState(new Set());
  const [imageErrors, setImageErrors] = useState({});
  const [deletingProducts, setDeletingProducts] = useState(new Set());
  const [showActive, setShowActive] = useState(true); // ✅ Toggle state

  // ✅ Filtered products with toggle
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (showActive) {
      return matchesSearch && product.isActive;
    } else {
      return matchesSearch && !product.isActive;
    }
  });

  const fetchProducts = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get("/api/store/product", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(
        data.products.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        )
      );
    } catch (error) {
      if (error?.response?.data?.error || error?.message) {
        toast.error(error?.response?.data?.error || error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  };

  const toggleStock = async (productId) => {
    setUpdatingProducts((prev) => new Set(prev).add(productId));

    try {
      const token = await getToken();
      const { data } = await axios.post(
        "/api/store/stock-toggle",
        { productId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProducts((prevProducts) =>
        prevProducts.map((product) =>
          product.id === productId
            ? { ...product, inStock: !product.inStock }
            : product
        )
      );

      toast.success(data.message);
    } catch (error) {
      if (error?.response?.data?.error || error?.message) {
        toast.error(error?.response?.data?.error || error.message);
      }
    } finally {
      setUpdatingProducts((prev) => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  const deleteProduct = async (productId, productName) => {
    toast(
      (t) => (
        <div className="flex flex-col gap-3">
          <p className="font-medium">Delete &quot;{productName}&quot;?</p>
          <p className="text-sm text-slate-600">
            This action cannot be undone.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                await confirmDelete(productId, productName);
              }}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition"
            >
              Delete
            </button>
          </div>
        </div>
      ),
      {
        duration: 10000,
        position: "top-center",
      }
    );
  };

  const confirmDelete = async (productId, productName) => {
    setDeletingProducts((prev) => new Set(prev).add(productId));

    try {
      const token = await getToken();
      const { data } = await axios.delete(`/api/store/product/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // ✅ Product update karo (remove nahi)
      setProducts((prev) => 
        prev.map((product) => 
          product.id === productId 
            ? { 
                ...product, 
                isActive: false, 
                inStock: false 
              }
            : product
        )
      );

      toast.success(data.message);
    } catch (error) {
      if (error?.response?.data?.error || error?.message) {
        toast.error(error?.response?.data?.error || error.message);
      }
    } finally {
      setDeletingProducts((prev) => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  const handleImageError = (productId) => {
    setImageErrors((prev) => ({ ...prev, [productId]: true }));
  };

  useEffect(() => {
    if (user) {
      fetchProducts();
    }
  }, [user]);

  if (loading) return <Loading />;

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-5 gap-4">
        <h1 className="text-2xl text-slate-500">
          Manage <span className="text-slate-800 font-medium">Products</span>
        </h1>
        <div className="flex gap-3 items-center">
          {/* ✅ Toggle Buttons */}
 

<div className="flex bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-1.5 shadow-sm">
  <button
    onClick={() => setShowActive(true)}
    className={`p-1 rounded-xl transition-all duration-300 ${
      showActive 
        ? 'bg-blue-500 text-white shadow-md' 
        : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
    }`}
    title="Active Products"
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
</svg>
  </button>
  <button
    onClick={() => setShowActive(false)}
    className={`p-1 rounded-xl transition-all duration-300 ${
      !showActive 
        ? 'bg-red-500 text-white shadow-md' 
        : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
    }`}
    title="Discontinued Products"
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
  <circle cx="12" cy="12" r="10"/>
  <path d="M4.93 4.93l14.14 14.14"/>
</svg>
  </button>
</div>

          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 p-2 px-4 border border-slate-200 rounded text-sm"
          />
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-black text-white px-4 py-2 rounded hover:bg-slate-800 transition text-sm whitespace-nowrap"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <table className="w-full max-w-4xl text-left ring ring-slate-200 rounded overflow-hidden text-sm">
          <thead className="bg-slate-50 text-gray-700 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">MRP</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="text-slate-700">
            {filteredProducts.length === 0 ? (
              <tr>
                <td
                  colSpan="5"
                  className="px-4 py-8 text-center text-slate-500"
                >
                  <div className="flex flex-col items-center justify-center">
                    <p className="text-lg">
                      {showActive 
                        ? (searchTerm ? "No active products found" : "No active products yet")
                        : (searchTerm ? "No discontinued products found" : "No discontinued products yet")
                      }
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => (
                <tr
                  key={product.id}
                  className={`border-t border-gray-200 hover:bg-gray-50 ${
                    !product.isActive ? 'bg-red-50 opacity-80' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex gap-2 items-center">
                      <Image
                        width={40}
                        height={40}
                        className={`p-1 shadow rounded cursor-pointer ${
                          !product.isActive ? 'opacity-50' : ''
                        }`}
                        src={
                          imageErrors[product.id]
                            ? "/placeholder-image.jpg"
                            : product.images[0]
                        }
                        alt={product.name}
                        onError={() => handleImageError(product.id)}
                      />
                      <div className="flex flex-col">
                        <span className={!product.isActive ? 'line-through text-slate-500' : ''}>
                          {product.name}
                        </span>
                        {!product.isActive && (
                          <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded w-fit mt-1">
                            Discontinued
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-md text-slate-600 truncate">
                    {product.description}
                  </td>
                  <td className="px-4 py-3">
                    {currency} {product.mrp.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {currency} {product.price.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 justify-start">
                      <label
                        className={`relative inline-flex items-center cursor-pointer text-gray-900 gap-3 ${
                          updatingProducts.has(product.id) || !product.isActive ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          onChange={() =>
                            !product.isActive ? null : toast.promise(toggleStock(product.id), {
                              loading: "Updating stock...",
                            })
                          }
                          checked={product.inStock}
                          disabled={updatingProducts.has(product.id) || !product.isActive}
                        />
                        <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:bg-green-600 transition-colors duration-200"></div>
                        <span className="dot absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-4"></span>
                      </label>
                      <button
                        onClick={() => 
                          !product.isActive ? null : deleteProduct(product.id, product.name)
                        }
                        disabled={deletingProducts.has(product.id) || !product.isActive}
                        className={`relative p-2 rounded-full transition-all duration-200 ${
                          deletingProducts.has(product.id)
                            ? "bg-red-400 text-white cursor-not-allowed"
                            : !product.isActive
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-red-100 text-red-700 hover:bg-red-200 hover:text-red-800"
                        }`}
                      >
                        {deletingProducts.has(product.id) ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Trash2Icon size={16} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-8 text-slate-500 border border-slate-200 rounded-lg">
            <p className="text-lg">
              {showActive 
                ? (searchTerm ? "No active products found" : "No active products yet")
                : (searchTerm ? "No discontinued products found" : "No discontinued products yet")
              }
            </p>
            <p className="text-sm">
              {searchTerm
                ? "Try adjusting your search"
                : "Add your first product to get started"}
            </p>
          </div>
        ) : (
          filteredProducts.map((product) => (
            <div
              key={product.id}
              className={`border border-slate-200 rounded-lg p-4 bg-white ${
                !product.isActive ? 'bg-red-50 opacity-80' : ''
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                <Image
                  width={50}
                  height={50}
                  className={`p-1 shadow rounded flex-shrink-0 ${
                    !product.isActive ? 'opacity-50' : ''
                  }`}
                  src={
                    imageErrors[product.id]
                      ? "/placeholder-image.jpg"
                      : product.images[0]
                  }
                  alt={product.name}
                  onError={() => handleImageError(product.id)}
                />
                <div className="flex-1 min-w-0">
                  <h3 className={`font-medium truncate ${
                    !product.isActive ? 'line-through text-slate-500' : 'text-slate-800'
                  }`}>
                    {product.name}
                  </h3>
                  <p className="text-slate-600 text-sm mt-1 line-clamp-2">
                    {product.description}
                  </p>
                  {!product.isActive && (
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded w-fit mt-1 inline-block">
                      Discontinued
                    </span>
                  )}
                  <div className="flex gap-4 mt-2">
                    <span className="text-slate-500 text-sm line-through">
                      {currency} {product.mrp.toLocaleString()}
                    </span>
                    <span className="text-slate-800 font-medium">
                      {currency} {product.price.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <label
                  className={`relative inline-flex items-center cursor-pointer text-gray-900 gap-3 ${
                    updatingProducts.has(product.id) || !product.isActive ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    onChange={() =>
                      !product.isActive ? null : toast.promise(toggleStock(product.id), {
                        loading: "Updating stock...",
                      })
                    }
                    checked={product.inStock}
                    disabled={updatingProducts.has(product.id) || !product.isActive}
                  />
                  <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:bg-green-600 transition-colors duration-200"></div>
                  <span className="dot absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-4"></span>
                  <span className="text-sm text-slate-600">
                    {product.inStock ? "In Stock" : "Out of Stock"}
                  </span>
                </label>
                <button
                  onClick={() => 
                    !product.isActive ? null : deleteProduct(product.id, product.name)
                  }
                  disabled={deletingProducts.has(product.id) || !product.isActive}
                  className={`relative p-2 rounded-full transition-all duration-200 ${
                    deletingProducts.has(product.id)
                      ? "bg-red-400 text-white cursor-not-allowed"
                      : !product.isActive
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-red-100 text-red-700 hover:bg-red-200 hover:text-red-800"
                  }`}
                >
                  {deletingProducts.has(product.id) ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Trash2Icon size={16} />
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}