'use client'
import { assets } from "@/assets/assets"
import { useEffect, useState } from "react"
import Image from "next/image"
import toast from "react-hot-toast"
import Loading from "@/components/Loading"
import { useAuth, useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import axios from "axios"

export default function CreateStore() {
    const { user } = useUser()
    const router = useRouter()
    const { getToken } = useAuth()
    
    const [alreadySubmitted, setAlreadySubmitted] = useState(false)
    const [status, setStatus] = useState("")
    const [loading, setLoading] = useState(true)
    const [message, setMessage] = useState("")
    const [refreshingStatus, setRefreshingStatus] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const [storeInfo, setStoreInfo] = useState({
        name: "",
        username: "",
        description: "",
        email: "",
        contact: "",
        address: "",
        image: ""
    })

    const isFormValid = Object.values(storeInfo).every(value => value !== "")

    const onChangeHandler = (e) => {
        setStoreInfo(prev => ({ 
            ...prev, 
            [e.target.name]: e.target.value 
        }))
    }

    const fetchSellerStatus = async (isManualRefresh = false) => {
        if (isManualRefresh) {
            setRefreshingStatus(true)
        } else {
            setLoading(true)
        }
        
        try {
            const token = await getToken()
            const response = await axios.get('/api/store/create', {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 80000 // Increased timeout
            })
            
            console.log('📊 Store status response:', response.data)
            
            if (response.data.status && response.data.status !== "Not Registered") {
                setAlreadySubmitted(true)
                setStatus(response.data.status)
                
                let statusMessage = ""
                if (response.data.status === "approved") {
                    statusMessage = "Your store has been approved! Redirecting to dashboard..."
                } else if (response.data.status === "pending") {
                    statusMessage = "Your store application is pending approval."
                } else if (response.data.status === "rejected") {
                    statusMessage = "Your store application was not approved."
                }
                
                setMessage(statusMessage)
                
                if (response.data.status === "approved") {
                    setTimeout(() => router.push('/store'), 3000)
                }
            } else {
                // Explicitly set to false if not registered
                setAlreadySubmitted(false)
                setStatus("")
            }
        } catch (error) {
            console.error("❌ Error fetching store status:", error)
            
            // If there's an error, assume no store exists and show form
            if (error.response?.status === 400 || error.code === 'ECONNABORTED') {
                setAlreadySubmitted(false)
                toast.error("Failed to check store status. You can proceed with application.")
            } else {
                toast.error("Network error. Please check your connection.")
            }
        } finally {
            setLoading(false)
            setRefreshingStatus(false)
        }
    }

    const onSubmitHandler = async (e) => {
        e.preventDefault()
        
        if (!user) {
            return toast.error('Please login to continue')
        }

        if (!isFormValid) {
            return toast.error('Please fill all fields')
        }

        setSubmitting(true)
        const loadingToast = toast.loading("Submitting store application...")

        try {
            const token = await getToken()
            
            const formData = new FormData()
            Object.keys(storeInfo).forEach(key => {
                if (storeInfo[key]) {
                    formData.append(key, storeInfo[key])
                }
            })

            const { data } = await axios.post('/api/store/create', formData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                },
                timeout: 45000 // Increased timeout for image upload
            })

            toast.dismiss(loadingToast)
            toast.success(data.message || "Store application submitted successfully!")
            
            // Refresh status after successful submission
            setTimeout(() => fetchSellerStatus(), 2000)

        } catch (error) {
            toast.dismiss(loadingToast)
            
            // Show specific error messages from backend
            const errorMessage = error?.response?.data?.error || "Something went wrong!"
            toast.error(errorMessage)
            
            // If username taken, clear the username field
            if (errorMessage.includes('username') || errorMessage.includes('Username')) {
                setStoreInfo(prev => ({ ...prev, username: "" }))
            }
        } finally {
            setSubmitting(false)
        }
    }

    useEffect(() => {
        if (user) {
            fetchSellerStatus()
        }
    }, [user])

    if (!user) {
        return (
            <div className="min-h-[80vh] max-6 flex items-center justify-center text-slate-400">
                <h1 className="text-2xl sm:text-4xl font-semibold">
                    Please <span className="text-slate-500">Login</span> to continue
                </h1>
            </div>
        )
    }

    if (loading) {
        return <Loading />
    }

    if (alreadySubmitted) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
                <p className="sm:text-2xl lg:text-3xl mx-5 font-semibold text-slate-500 text-center max-w-2xl">
                    {message}
                </p>
                
                
                
                {status === "pending" && (
                    <div className="mt-6 text-center">
                        <button 
                            onClick={() => fetchSellerStatus(false)}
                            disabled={refreshingStatus}
                            className="bg-slate-800 text-white px-6 py-2 rounded hover:bg-slate-900 transition disabled:opacity-50 flex items-center gap-2"
                        >
                            {refreshingStatus ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Checking Status...
                                </>
                            ) : (
                                'Check Status Again'
                            )}
                        </button>
                    </div>
                )}

                {status === "rejected" && (
                    <div className="mt-6 text-center">
                        
                        <button 
                            onClick={() => {
                                setAlreadySubmitted(false)
                                setStoreInfo({
                                    name: "",
                                    username: "",
                                    description: "",
                                    email: "",
                                    contact: "",
                                    address: "",
                                    image: ""
                                })
                            }}
                            className="bg-slate-800 text-white px-6 py-2 rounded hover:bg-slate-900 transition"
                        >
                            Submit New Application
                        </button>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="mx-6 min-h-[70vh] my-16">
            <form onSubmit={onSubmitHandler} className="max-w-7xl mx-auto flex flex-col items-start gap-3 text-slate-500">
                <div>
                    <h1 className="text-3xl">Add Your <span className="text-slate-800 font-medium">Store</span></h1>
                    <p className="max-w-lg">To become a seller on GoCart, submit your store details for review. Your store will be activated after admin verification.</p>
                </div>

                <label className="mt-10 cursor-pointer">
                    Store Logo *
                    <Image 
                        src={storeInfo.image ? URL.createObjectURL(storeInfo.image) : assets.upload_area} 
                        className="rounded-lg mt-2 h-16 w-auto border border-slate-300" 
                        alt="Store logo preview" 
                        width={150} 
                        height={100} 
                    />
                    <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => setStoreInfo(prev => ({ ...prev, image: e.target.files[0] }))} 
                        hidden 
                        required
                    />
                    {!storeInfo.image && <p className="text-sm text-red-500 mt-1">Store logo is required</p>}
                </label>

                {['username', 'name', 'email', 'contact'].map(field => (
                    <div key={field} className="w-full max-w-lg">
                        <p>{field.charAt(0).toUpperCase() + field.slice(1)} *</p>
                        <input 
                            name={field}
                            onChange={onChangeHandler}
                            value={storeInfo[field]}
                            type={field === 'email' ? 'email' : 'text'}
                            placeholder={`Enter your store ${field}`}
                            className="border border-slate-300 outline-slate-400 w-full p-2 rounded mt-1"
                            required
                            disabled={submitting}
                        />
                    </div>
                ))}

                {['description', 'address'].map(field => (
                    <div key={field} className="w-full max-w-lg">
                        <p>{field.charAt(0).toUpperCase() + field.slice(1)} *</p>
                        <textarea 
                            name={field}
                            onChange={onChangeHandler}
                            value={storeInfo[field]}
                            rows={5}
                            placeholder={`Enter your store ${field}`}
                            className="border border-slate-300 outline-slate-400 w-full p-2 rounded resize-none mt-1"
                            required
                            disabled={submitting}
                        />
                    </div>
                ))}

                <button 
                    type="submit" 
                    className="bg-slate-800 text-white px-12 py-2 rounded mt-10 mb-40 active:scale-95 hover:bg-slate-900 transition disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center gap-2"
                    disabled={!isFormValid || submitting}
                >
                    {submitting ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Submitting...
                        </>
                    ) : (
                        'Submit Application'
                    )}
                </button>
            </form>
        </div>
    )
}