
import type { Timestamp } from "firebase/firestore";

export interface Product {
  id: string;
  brand: string;
  model: string;
  price: number;
  discountPercentage?: number;
  capacity: string;
  stock: number;
  condition: "New" | "Used";
  imageUrls?: string[]; // Make optional to support old format
  imageUrl?: string; // Add old field for backward compatibility
  description: string;
  category: string;
  features?: string;
  warranty?: string;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  aiHint?: string;
}

export interface Service {
  id:string;
  name: string;
  description: string;
  category: string;
  status: 'Active' | 'Inactive';
  price?: number;
  minPrice?: number;
  maxPrice?: number;
  duration?: string;
  icon?: string;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export interface Enquiry {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: Timestamp | Date;
  status: 'New' | 'Read';
}

export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  src: string;
  thumbnail?: string; // for videos
  title: string;
  description?: string;
  aiHint: string;
}

export interface Address {
  id: string; // Firestore document ID
  userId: string; // To link address to user
  type: 'Home' | 'Work' | 'Other'; // e.g., Home, Work
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault?: boolean;
}

export interface Appointment {
  id: string; // Firestore document ID
  userId: string;
  name: string; // Name provided in booking form
  email: string; // Email provided in booking form
  phone: string;
  address: string;
  serviceType: string;
  bookingDate: string; // Store as ISO string "yyyy-MM-dd"
  bookingTime: string;
  status: 'Payment Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  createdAt: any; // Firestore ServerTimestamp or Date object after fetch
  paymentId?: string; // Razorpay Payment ID
  pricePaid?: number; // Amount paid, in smallest currency unit (e.g., paise)
  paymentAmount?: number; // The amount to be paid for the service
}

export interface Order {
  id: string; // Firestore document ID will be auto-generated
  userId: string;
  productId: string;
  productDetails: {
    brand: string;
    model: string;
    price: number; // Price at time of order, in smallest currency unit (paise)
    imageUrl?: string;
  };
  shippingAddress: Address;
  status: 'Placed' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled';
  paymentMethod: 'Online' | 'COD';
  paymentId?: string; // from Razorpay, for online orders
  createdAt: any; // Firestore ServerTimestamp
  pricePaid: number; // in smallest currency unit (e.g., paise for INR)
  estimatedDeliveryDate?: any;
  shippedDate?: any;
  deliveredDate?: any;
}


// Enhanced User type for admin display and Firestore documents
export interface User {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  phone?: string | null;
  createdAt?: Timestamp | Date | string; // Firestore timestamp, can be Date after fetch, or string for display
  provider?: string; // e.g., 'google.com', 'email/password'
  accountStatus?: 'active' | 'suspended' | 'deactivated';
  isAdmin?: boolean;
}
