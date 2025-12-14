
export interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
  requireSelfie?: boolean;
}

export interface Shift {
  id: string;
  name: string;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
}

export interface JobTitle {
  id: string;
  name: string;
  hourlyRate: number; // VND per hour
}

export interface Employee {
  id: string;
  username: string; // Unique login identifier
  password: string; // Hashing should be used in a real app
  name: string; // Display name
  deviceCode: string; // 5-character unique device/account identifier
  shiftId?: string | null; // Optional link to a Shift, allow null for "no shift"
  locationId?: string | null; // Optional link to a Location, allow null for "no location"
  jobTitleId?: string | null; // Optional link to a JobTitle
  faceDescriptor?: string; // JSON stringified array of face descriptor numbers
}

// FIX: Add CurrentUser type definition here to be shared across the app.
export type CurrentUser = Employee | { id: 'admin'; name: 'Admin', username: 'admin' };

export enum AttendanceStatus {
  CHECK_IN = 'CHECK_IN',
  CHECK_OUT = 'CHECK_OUT',
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  username: string; // Replaced employeeCode
  timestamp: number;
  status: AttendanceStatus;
  shiftName?: string; // To display in logs
  isLate?: boolean;
  isEarly?: boolean;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  selfieImage?: string; // Base64 encoded image
  isManualEntry?: boolean; // Flag for records created via request approval
}

export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface AttendanceRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  username: string;
  timestamp: number;
  type: AttendanceStatus; // Requesting to Check-in or Check-out
  reason: string;
  evidenceImage: string; // Required photo evidence
  status: RequestStatus;
}

// --- F&B / POS Types ---

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string; // e.g., "Coffee", "Tea", "Cake"
  imageUrl?: string;
  isAvailable: boolean;
}

export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  note?: string;
}

export enum OrderStatus {
  PENDING = 'PENDING',       // Mới tạo
  PREPARING = 'PREPARING',   // Đang làm
  COMPLETED = 'COMPLETED',   // Đã xong
  CANCELLED = 'CANCELLED'    // Hủy
}

export interface Order {
  id: string;
  timestamp: number;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: 'CASH' | 'TRANSFER';
  staffId?: string; // Who created the order
  staffName?: string;
  tableNumber?: string; // Optional table tracking
}