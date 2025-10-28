"use client";
import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { DeleteIcon, Loader2 } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";

export default function AdminCoupons() {
  const { getToken } = useAuth();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false); // ✅ Added loading state

  const [newCoupon, setNewCoupon] = useState({
    code: "",
    description: "",
    discount: "",
    forNewUser: false,
    forMember: false,
    isPublic: false,
    expiresAt: new Date(),
  });

  // ✅ Better: useCallback for stable function reference
  const fetchCoupons = useCallback(async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get("/api/admin/coupon", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCoupons(data.coupons);
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    }
  }, [getToken]);

  const handleAddCoupon = async (e) => {
    e.preventDefault();
    setLoading(true); // ✅ Start loading

    try {
      const token = await getToken();
      // ✅ Better validation
      if (!newCoupon.code.trim() || !newCoupon.description.trim()) {
        toast.error("Please fill all fields");
        setLoading(false);
        return;
      }

      const couponData = {
        ...newCoupon,
        discount: Number(newCoupon.discount),
        expiresAt: new Date(newCoupon.expiresAt),
      };

      const { data } = await axios.post(
        "/api/admin/coupon",
        { coupon: couponData },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(data.message);
      await fetchCoupons();

      // ✅ Reset form after success
      setNewCoupon({
        code: "",
        description: "",
        discount: "",
        forNewUser: false,
        forMember: false,
        isPublic: false,
        expiresAt: new Date(),
      });
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    } finally {
      setLoading(false); // ✅ Stop loading in all cases
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewCoupon({
      ...newCoupon,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const deleteCoupon = async (code) => {
    // ✅ Toast confirmation instead of window.confirm
    toast(
      (t) => (
        <div className="flex flex-col gap-3">
          <p className="font-medium">
            Delete Coupon <span className="font-bold">{code}</span>?
          </p>
          <p className="text-sm text-slate-600">
            This action cannot be undone.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                try {
                  const token = await getToken();
                  await axios.delete(`/api/admin/coupon?code=${code}`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  await fetchCoupons();
                  toast.success("Coupon deleted successfully");
                } catch (error) {
                  toast.error(error?.response?.data?.error || error.message);
                }
              }}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      ),
      {
        duration: 10000, // 10 seconds
        position: "top-center",
      }
    );
  };

  // ✅ Fixed useEffect
  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  return (
    <div className="text-slate-500 mb-40 p-6">
      {/* Add Coupon */}
      <form
        onSubmit={handleAddCoupon}
        className="max-w-sm text-sm bg-white p-6 rounded-lg shadow-md relative"
      >
        <h2 className="text-2xl font-bold mb-4">
          Add <span className="text-slate-800">Coupons</span>
        </h2>

        <div className="flex gap-2 max-sm:flex-col">
          <input
            type="text"
            placeholder="Coupon Code"
            className="w-full mt-2 p-2 border border-slate-200 focus:outline-slate-400 rounded-md"
            name="code"
            value={newCoupon.code}
            onChange={handleChange}
            required
            disabled={loading} // ✅ Disable when loading
          />
          <input
            type="number"
            placeholder="Discount %"
            min={1}
            max={100}
            className="w-full mt-2 p-2 border border-slate-200 focus:outline-slate-400 rounded-md"
            name="discount"
            value={newCoupon.discount}
            onChange={handleChange}
            required
            disabled={loading} // ✅ Disable when loading
          />
        </div>

        <input
          type="text"
          placeholder="Coupon Description"
          className="w-full mt-2 p-2 border border-slate-200 focus:outline-slate-400 rounded-md"
          name="description"
          value={newCoupon.description}
          onChange={handleChange}
          required
          disabled={loading} // ✅ Disable when loading
        />

        <label className="block mt-3">
          <span className="text-slate-700 font-medium">Coupon Expiry Date</span>
          <input
            type="date"
            className="w-full mt-1 p-2 border border-slate-200 focus:outline-slate-400 rounded-md"
            name="expiresAt"
            value={format(newCoupon.expiresAt, "yyyy-MM-dd")}
            onChange={handleChange}
            min={format(new Date(), "yyyy-MM-dd")}
            disabled={loading} // ✅ Disable when loading
          />
        </label>

        <div className="mt-5 space-y-3">
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                name="forNewUser"
                checked={newCoupon.forNewUser}
                onChange={handleChange}
                disabled={loading} // ✅ Disable when loading
              />
              <div
                className={`w-11 h-6 rounded-full peer peer-checked:bg-green-600 transition-colors duration-200 ${
                  loading ? "bg-slate-200" : "bg-slate-300"
                }`}
              ></div>
              <span className="dot absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></span>
            </label>
            <span className="text-slate-700">For New User</span>
          </div>

          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                name="forMember"
                checked={newCoupon.forMember}
                onChange={handleChange}
                disabled={loading} // ✅ Disable when loading
              />
              <div
                className={`w-11 h-6 rounded-full peer peer-checked:bg-green-600 transition-colors duration-200 ${
                  loading ? "bg-slate-200" : "bg-slate-300"
                }`}
              ></div>
              <span className="dot absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></span>
            </label>
            <span className="text-slate-700">For Member</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading} // ✅ Disable when loading
          className="mt-4 p-2 px-10 rounded bg-slate-700 text-white hover:bg-slate-800 active:scale-95 transition-all duration-200 w-full flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Adding Coupon...
            </>
          ) : (
            "Add Coupon"
          )}
        </button>
      </form>

      {/* List Coupons */}
      <div className="mt-14">
        <h2 className="text-2xl font-bold mb-4">
          List <span className="text-slate-800">Coupons</span>
        </h2>

        {coupons.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            No coupons found. Add your first coupon above.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 max-w-4xl bg-white">
            <table className="min-w-full bg-white text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="py-3 px-4 text-left font-semibold text-slate-600">
                    Code
                  </th>
                  <th className="py-3 px-4 text-left font-semibold text-slate-600">
                    Description
                  </th>
                  <th className="py-3 px-4 text-left font-semibold text-slate-600">
                    Discount
                  </th>
                  <th className="py-3 px-4 text-left font-semibold text-slate-600">
                    Expires At
                  </th>
                  <th className="py-3 px-4 text-left font-semibold text-slate-600">
                    New User
                  </th>
                  <th className="py-3 px-4 text-left font-semibold text-slate-600">
                    For Member
                  </th>
                  <th className="py-3 px-4 text-left font-semibold text-slate-600">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {coupons.map((coupon) => (
                  <tr
                    key={coupon.code}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {coupon.code}
                    </td>
                    <td className="py-3 px-4 text-slate-800 max-w-xs truncate">
                      {coupon.description}
                    </td>
                    <td className="py-3 px-4 text-slate-800">
                      {coupon.discount}%
                    </td>
                    <td className="py-3 px-4 text-slate-800">
                      {format(new Date(coupon.expiresAt), "yyyy-MM-dd")}
                    </td>
                    <td className="py-3 px-4 text-slate-800">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          coupon.forNewUser
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {coupon.forNewUser ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-800">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          coupon.forMember
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {coupon.forMember ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <DeleteIcon
                        onClick={() => deleteCoupon(coupon.code)}
                        className="w-5 h-5 text-red-500 hover:text-red-700 cursor-pointer transition-colors"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
