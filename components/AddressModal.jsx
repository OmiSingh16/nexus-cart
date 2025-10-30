'use client'
import { XIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "react-hot-toast"
import { useDispatch, useSelector } from "react-redux"
import { useAuth } from "@clerk/nextjs"
import { addAddressToServer } from "@/lib/features/address/addressSlice"

const AddressModal = ({ setShowAddressModal }) => {
    const dispatch = useDispatch()
    const { getToken } = useAuth()
    const { loading } = useSelector((state) => state.address)

    const [address, setAddress] = useState({
    name: '',
    email: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'India',
    phone: '+91 ' // ✅ Perfect for Indian users
})

    const handleAddressChange = (e) => {
    if (e.target.name === 'phone') {
        let value = e.target.value
        // ✅ Ensure format maintained
        if (!value.startsWith('+91 ')) {
            value = '+91 ' + value.replace(/^(\+91|91)/, '').trim()
        }
        setAddress({
            ...address,
            [e.target.name]: value
        })
    } else {
        setAddress({
            ...address,
            [e.target.name]: e.target.value
        })
    }
}

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        try {
            await dispatch(addAddressToServer({ 
                address: address,
                getToken 
            })).unwrap()
            
            toast.success('Address added successfully!')
            setShowAddressModal(false)
        } catch (error) {
            const errorMessage = typeof error === 'object' ? error.error : error
            toast.error(errorMessage || 'Failed to add address')
        }
    }

    return (
        <form onSubmit={handleSubmit} className="fixed inset-0 z-50 bg-white/60 backdrop-blur h-screen flex items-center justify-center">
            {/* ✅ Border added to main container */}
            <div className="flex flex-col gap-5 text-slate-700 w-full max-w-sm mx-6 border border-gray-300 rounded-lg p-6 bg-white">
                <h2 className="text-3xl ">Add New <span className="font-semibold">Address</span></h2>
                
                <input name="name" onChange={handleAddressChange} value={address.name} className="p-2 px-4 outline-none border border-slate-200 rounded w-full" type="text" placeholder="Enter your name" required />
                <input name="email" onChange={handleAddressChange} value={address.email} className="p-2 px-4 outline-none border border-slate-200 rounded w-full" type="email" placeholder="Email address" required />
                <input name="street" onChange={handleAddressChange} value={address.street} className="p-2 px-4 outline-none border border-slate-200 rounded w-full" type="text" placeholder="Street" required />
                
                <div className="flex gap-4">
                    <input name="city" onChange={handleAddressChange} value={address.city} className="p-2 px-4 outline-none border border-slate-200 rounded w-full" type="text" placeholder="City" required />
                    <input name="state" onChange={handleAddressChange} value={address.state} className="p-2 px-4 outline-none border border-slate-200 rounded w-full" type="text" placeholder="State" required />
                </div>
                
                <div className="flex gap-4">
                    <input name="zip" onChange={handleAddressChange} value={address.zip} className="p-2 px-4 outline-none border border-slate-200 rounded w-full" type="text" placeholder="Zip code" required />
                    
                    {/* ✅ Country Dropdown */}
                    <select 
                        name="country" 
                        onChange={handleAddressChange} 
                        value={address.country}
                        className="p-2 px-4 outline-none border border-slate-200 rounded w-full bg-white"
                        required
                    >
                        <option value="India">India</option>
                        {/* <option value="United States">United States</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="Canada">Canada</option>
                        <option value="Australia">Australia</option> */}
                    </select>
                </div>
                
                <input name="phone" onChange={handleAddressChange} value={address.phone} className="p-2 px-4 outline-none border border-slate-200 rounded w-full" type="text" placeholder="Phone" required />
                
                <button 
                    disabled={loading}
                    className={`bg-slate-800 text-white text-sm font-medium py-2.5 rounded-md hover:bg-slate-900 active:scale-95 transition-all ${
                        loading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                >
                    {loading ? 'Adding Address...' : 'SAVE ADDRESS'}
                </button>
            </div>
            
            <XIcon 
                size={30} 
                className="absolute top-5 right-5 text-slate-500 hover:text-slate-700 cursor-pointer" 
                onClick={() => setShowAddressModal(false)} 
            />
        </form>
    )
}

export default AddressModal