"use client";
import StoreInfo from "@/components/admin/StoreInfo";
import Loading from "@/components/Loading";
import { useAuth } from "@clerk/clerk-react";
import { useUser } from "@clerk/nextjs";
import axios from "axios";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function AdminStores() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingStoreId, setUpdatingStoreId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStores = async (isQuickRefresh = false) => {
    if (isQuickRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const token = await getToken();
      const { data } = await axios.get("/api/admin/stores", {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000,
      });
      
      const previousCount = stores.length;
      const newCount = data.stores?.length || 0;
      
      setStores(data.stores || []);
      
      // Show notification only for quick refresh
      if (isQuickRefresh) {
        if (newCount > previousCount) {
          toast.success(`${newCount - previousCount} new store(s) found`);
        } else if (newCount < previousCount) {
          toast.success(`${previousCount - newCount} store(s) removed`);
        } else {
          toast.success('No changes found');
        }
      }
    } catch (error) {
      console.error("Error fetching stores:", error);
      if (!isQuickRefresh) {
        toast.error(error?.response?.data?.error || "Failed to load stores");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const toggleIsActive = async (storeId, currentStatus) => {
    if (updatingStoreId) return;
    
    setUpdatingStoreId(storeId);
    try {
      const token = await getToken();
      const { data } = await axios.post(
        "/api/admin/toggle-store",
        { storeId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Optimistic update
      setStores(prev => prev.map(store => 
        store.id === storeId 
          ? { ...store, isActive: !currentStatus }
          : store
      ));
      
      // Single toast message
      toast.success(data.message || `Store ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      // Revert optimistic update on error
      setStores(prev => prev.map(store => 
        store.id === storeId 
          ? { ...store, isActive: currentStatus }
          : store
      ));
      toast.error(error?.response?.data?.error || "Failed to update store status");
    } finally {
      setUpdatingStoreId(null);
    }
  };

  const handleToggle = (storeId, currentStatus) => {
    // Remove toast.promise - handle single toast in toggleIsActive
    toggleIsActive(storeId, currentStatus);
  };

  const handleQuickRefresh = () => {
    fetchStores(true);
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">
            Live <span className="text-slate-800">Stores</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {stores.length} store(s) found
          </p>
        </div>
        <button 
          onClick={handleQuickRefresh}
          disabled={refreshing}
          className="px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {refreshing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Refreshing...
            </>
          ) : (
            'Check for New'
          )}
        </button>
      </div>

      <div className={`transition-opacity duration-300 ${refreshing ? 'opacity-50' : 'opacity-100'}`}>
        {stores.length > 0 ? (
          <div className="flex flex-col gap-4">
            {stores.map((store) => (
              <div
                key={store.id}
                className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 flex max-md:flex-col gap-6 md:items-center justify-between transition-all duration-300"
              >
                <StoreInfo store={store} />

                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    store.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {store.isActive ? 'Active' : 'Inactive'}
                  </span>
                  
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      onChange={() => handleToggle(store.id, store.isActive)}
                      checked={store.isActive}
                      disabled={updatingStoreId === store.id || refreshing}
                    />
                    <div className={`w-11 h-6 rounded-full peer transition-colors duration-200 ${
                      store.isActive ? 'bg-green-600' : 'bg-slate-300'
                    } ${updatingStoreId === store.id ? 'opacity-50' : ''}`}></div>
                    <span className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out ${
                      store.isActive ? 'translate-x-5' : ''
                    } ${updatingStoreId === store.id ? 'animate-pulse' : ''}`}></span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <h1 className="text-2xl text-slate-400 font-medium mb-2">
              No Stores Available
            </h1>
            <p className="text-slate-500 text-sm mb-4">
              There are no stores in the system yet
            </p>
            <button 
              onClick={handleQuickRefresh}
              className="px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 text-sm transition-colors"
            >
              Check Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}