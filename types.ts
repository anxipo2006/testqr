
export interface Company {
  id: string;
  name: string;
  createdAt: number;
}

export interface Location {
  id: string;
  companyId: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; 
  requireSelfie?: boolean;
}

export interface Shift {
  id: string;
  companyId: string;
  name: string;
  startTime: string; 
  endTime: string;   
}

export interface JobTitle {
  id: string;
  companyId: string;
  name: string;
  hourlyRate: number;
}

export interface Employee {
  id: string;
  companyId: string;
  username: string; 
  password: string; 
  name: string; 
  deviceCode: string; 
  shiftId?: string | null;
  locationId?: string | null;
  jobTitleId?: string | null;
  faceDescriptor?: string;
}

export interface AdminAccount {
  id: string;
  companyId: string; // "super" if super admin
  username: string;
  password: string;
  name: string;
  role: 'SUPER_ADMIN' | 'COMPANY_ADMIN';
}

export type CurrentUser = Employee | AdminAccount;

export enum AttendanceStatus {
  CHECK_IN = 'CHECK_IN',
  CHECK_OUT = 'CHECK_OUT',
}

export interface AttendanceRecord {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  username: string;
  timestamp: number;
  status: AttendanceStatus;
  shiftName?: string;
  isLate?: boolean;
  isEarly?: boolean;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  selfieImage?: string;
  isManualEntry?: boolean;
}

export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface AttendanceRequest {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  username: string;
  timestamp: number;
  type: AttendanceStatus;
  reason: string;
  evidenceImage: string;
  status: RequestStatus;
}

// F&B Types
export interface Product {
  id: string;
  companyId: string;
  name: string;
  price: number;
  category: string;
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
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface Order {
  id: string;
  companyId: string;
  timestamp: number;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: 'CASH' | 'TRANSFER';
  staffId?: string;
  staffName?: string;
  tableNumber?: string;
}
