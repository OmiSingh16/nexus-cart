"use client";
import StoreInfo from "@/components/admin/StoreInfo";
import Loading from "@/components/Loading";
import { useAuth } from "@clerk/clerk-react";
import { useUser } from "@clerk/nextjs";
import axios from "axios";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function AdminApprove() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [quickRefreshing, setQuickRefreshing] = useState(false);
  const [rejectingStoreId, setRejectingStoreId] = useState(null);

  // Initial load - full page loading
  const fetchStores = async (retries = 3) => {
    setLoading(true);
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const token = await getToken();
        const { data } = await axios.get("/api/admin/approve-store", {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 80000,
        });
        
        setStores(data.stores || []);
        break;
        
      } catch (error) {
        if (attempt === retries - 1) {
          toast.error("Failed to load stores. Please try again.");
        } else {
          await new Promise(resolve => setTimeout(resolve, 5000 * (attempt + 1)));
        }
      }
    }
    
    setLoading(false);
  };

  // TOP BUTTON: Quick silent refresh - no page loading
  const handleQuickRefresh = async () => {
    setQuickRefreshing(true);
    
    try {
      const token = await getToken();
      const { data } = await axios.get("/api/admin/approve-store", {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      });
      
      const previousCount = stores.length;
      const newCount = data.stores?.length || 0;
      
      setStores(data.stores || []);
      
      // Show notification if new stores found
      if (newCount > previousCount) {
        toast.success(`${newCount - previousCount} new application(s) found`);
      } else if (newCount === previousCount) {
        toast.success('No new applications');
      }
      
    } catch (error) {
      console.log('Quick refresh failed:', error);
    } finally {
      setQuickRefreshing(false);
    }
  };

  // CENTER BUTTON: Full page reload
  const handleFullReload = () => {
    fetchStores();
  };

  const handleStatusUpdate = async (storeId, status) => {
  if (isUpdating) return;
  
  setIsUpdating(true);
  if (status === "rejected") {
    setRejectingStoreId(storeId);
  }
  
  try {
    const token = await getToken();
    console.log('🔄 Sending request:', { storeId, status }); // ✅ Debug
    
    const { data } = await axios.post(
      "/api/admin/approve-store",
      { storeId, status },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    
    
    
    setStores(prevStores => prevStores.filter(store => 
      (store._id || store.id) !== storeId
    ));
    
    return data.message || `Store ${status} successfully!`;
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data); // ✅ Debug
    throw new Error(error?.response?.data?.error || `Failed to ${status} store`);
  } finally {
    setIsUpdating(false);
    setRejectingStoreId(null);
  }
};

  const handleApprove = (storeId) => 
    toast.promise(
      handleStatusUpdate(storeId, "approved"),
      {
        loading: "Approving store...",
        success: (message) => message,
        error: (err) => err.message
      }
    );

  const handleReject = (storeId) => 
    toast.promise(
      handleStatusUpdate(storeId, "rejected"),
      {
        loading: "Rejecting store...",
        success: (message) => message,
        error: (err) => err.message
      }
    );

  // Confirmation for reject action
  const confirmReject = (storeId, storeName) => {
    toast((t) => (
      <div className="text-center">
        <p className="mb-4 font-medium">Reject store application?</p>
        <p className="text-sm text-slate-600 mb-4">"{storeName}" will be rejected.</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              handleReject(storeId);
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm transition-colors"
          >
            Yes, Reject
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-4 py-2 bg-slate-500 text-white rounded hover:bg-slate-600 text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    ), {
      duration: 10000, // 10 seconds
    });
  };

  useEffect(() => {
    if (user) {
      fetchStores();
    }
  }, [user]);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="text-slate-500 mb-28 px-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">
            Approve <span className="text-slate-800">Stores</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {stores.length} store(s) pending approval
          </p>
        </div>
        
        {/* TOP BUTTON: Only show when stores exist */}
        {stores.length > 0 && (
          <button 
            onClick={handleQuickRefresh}
            disabled={quickRefreshing || isUpdating}
            className="px-6 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {quickRefreshing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Checking...
              </>
            ) : (
              "Check for New"
            )}
          </button>
        )}
      </div>

      {stores.length > 0 ? (
        <div className="flex flex-col gap-4 mt-6">
          {stores.map((store) => (
            <div
              key={store._id || store.id}
              className="bg-white border rounded-lg shadow-sm p-6 flex max-md:flex-col gap-6 md:items-center justify-between"
            >
              <StoreInfo store={store} />
              
              <div className="flex gap-3 flex-shrink-0">
                <button
                  onClick={() => handleApprove(store._id || store.id)}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[80px] justify-center"
                >
                  {isUpdating && !rejectingStoreId ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    "Approve"
                  )}
                </button>
                <button
                  onClick={() => confirmReject(store._id || store.id, store.name)}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[80px] justify-center"
                >
                  {rejectingStoreId === (store._id || store.id) ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    "Reject"
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <h1 className="text-2xl text-slate-400 font-medium mb-2">
            No Applications Pending
          </h1>
          
          
          {/* CENTER BUTTON: Full Reload */}
          <button 
            onClick={handleFullReload}
            className="px-6 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 text-sm transition-colors"
          >
            Reload Page
          </button>
        </div>
      )}
    </div>
  );
}