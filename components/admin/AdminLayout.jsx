"use client";
import { useEffect, useState } from "react";
import Loading from "../Loading";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import AdminNavbar from "./AdminNavbar";
import AdminSidebar from "./AdminSidebar";
import { useUser, useAuth } from "@clerk/nextjs";
import axios from "axios";

const AdminLayout = ({ children }) => {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchIsAdmin = async () => {
    try {
      const token = await getToken();
      console.log(
        "Checking admin access for:",
        user?.emailAddresses?.[0]?.emailAddress
      );

      const response = await axios.get("/api/admin/is-admin", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("API Response:", response.data);
      setIsAdmin(response.data.isAdmin);
    } catch (error) {
      console.log("Admin check failed:", error.response?.data || error.message);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded) {
      if (user) {
        fetchIsAdmin();
      } else {
        setLoading(false);
      }
    }
  }, [user, isLoaded]);

  if (!isLoaded || loading) {
    return <Loading />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <h1 className="text-2xl sm:text-4xl font-semibold text-slate-400">
          You are not authorized to access this page
        </h1>

        <Link
          href="/"
          className="bg-slate-700 text-white flex items-center gap-2 mt-8 p-2 px-6 max-sm:text-sm rounded-full"
        >
          Go to home <ArrowRightIcon size={18} />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <AdminNavbar />
      <div className="flex flex-1 items-start h-full overflow-y-scroll no-scrollbar">
        <AdminSidebar />
        <div className="flex-1 h-full p-5 lg:pl-12 lg:pt-12 overflow-y-scroll">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
