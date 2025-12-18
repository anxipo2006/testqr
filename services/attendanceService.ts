
import { db } from './firebaseConfig';
import { AttendanceStatus, RequestStatus } from '../types';
import type { Employee, AttendanceRecord, Shift, CurrentUser, Location, JobTitle, AttendanceRequest, Company, AdminAccount } from '../types';

// Collections
const companiesCol = db.collection('companies');
const adminsCol = db.collection('admins');
const locationsCol = db.collection('locations');
const shiftsCol = db.collection('shifts');
const employeesCol = db.collection('employees');
const recordsCol = db.collection('records');
const jobTitlesCol = db.collection('jobTitles');
const requestsCol = db.collection('requests');

// --- Company Management (Super Admin only) ---
export const getCompanies = async (): Promise<Company[]> => {
  const snapshot = await companiesCol.get();
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Company));
};

export const addCompany = async (name: string): Promise<Company> => {
  const newCompany = { name, createdAt: Date.now() };
  const docRef = await companiesCol.add(newCompany);
  return { ...newCompany, id: docRef.id };
};

export const getCompanyAdmins = async (companyId: string): Promise<AdminAccount[]> => {
  const snapshot = await adminsCol.where('companyId', '==', companyId).get();
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AdminAccount));
};

export const addCompanyAdmin = async (companyId: string, name: string, username: string, password: string): Promise<AdminAccount> => {
  const newAdmin: Omit<AdminAccount, 'id'> = {
    companyId,
    name,
    username,
    password,
    role: 'COMPANY_ADMIN'
  };
  const docRef = await adminsCol.add(newAdmin);
  return { ...newAdmin, id: docRef.id };
};

// --- Authentication ---
export const login = async (
  role: 'admin' | 'employee',
  credentials: { username?: string; password?: string; deviceCode?: string }
): Promise<CurrentUser | null> => {
  if (role === 'admin') {
    // 1. Check Hardcoded Super Admin for first setup
    if (credentials.username === 'superadmin' && credentials.password === 'super123') {
      return { id: 'super', companyId: 'super', name: 'Super Admin', username: 'superadmin', password: '', role: 'SUPER_ADMIN' };
    }
    
    // 2. Check Admins collection
    const q = adminsCol.where("username", "==", credentials.username).limit(1);
    const snapshot = await q.get();
    if (snapshot.empty) return null;
    const adminDoc = snapshot.docs[0];
    const adminData = adminDoc.data() as AdminAccount;
    if (adminData.password === credentials.password) {
      return { ...adminData, id: adminDoc.id };
    }
    return null;
  }

  if (role === 'employee') {
    if (!credentials.deviceCode) return null;
    const q = employeesCol.where("deviceCode", "==", credentials.deviceCode.toUpperCase()).limit(1);
    const snapshot = await q.get();
    if (snapshot.empty) return null;
    const employeeDoc = snapshot.docs[0];
    return { ...employeeDoc.data(), id: employeeDoc.id } as Employee;
  }
  return null;
};

// --- Scoped Data Fetching ---
export const getLocations = async (companyId: string): Promise<Location[]> => {
  const snapshot = await locationsCol.where('companyId', '==', companyId).get();
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Location));
};

export const getLocationById = async (locationId: string): Promise<Location | null> => {
    const docRef = locationsCol.doc(locationId);
    const doc = await docRef.get();
    return doc.exists ? { ...doc.data(), id: doc.id } as Location : null;
};

export const addLocation = async (companyId: string, location: Omit<Location, 'id' | 'companyId'>): Promise<Location> => {
  const data = { ...location, companyId };
  const docRef = await locationsCol.add(data);
  return { ...data, id: docRef.id } as Location;
};

export const updateLocation = async (id: string, updates: Partial<Location>): Promise<void> => {
    await locationsCol.doc(id).update(updates);
};

export const deleteLocation = async (id: string): Promise<void> => {
  await locationsCol.doc(id).delete();
};

export const getShifts = async (companyId: string): Promise<Shift[]> => {
  const snapshot = await shiftsCol.where('companyId', '==', companyId).get();
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Shift));
};

export const addShift = async (companyId: string, name: string, startTime: string, endTime: string): Promise<Shift> => {
  const newShift = { companyId, name, startTime, endTime };
  const docRef = await shiftsCol.add(newShift);
  return { ...newShift, id: docRef.id } as Shift;
};

export const updateShift = async (id: string, updates: Partial<Shift>): Promise<void> => {
    await shiftsCol.doc(id).update(updates);
};

export const deleteShift = async (id: string): Promise<void> => {
  await shiftsCol.doc(id).delete();
};

export const getJobTitles = async (companyId: string): Promise<JobTitle[]> => {
  const snapshot = await jobTitlesCol.where('companyId', '==', companyId).get();
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as JobTitle));
};

export const addJobTitle = async (companyId: string, name: string, hourlyRate: number): Promise<JobTitle> => {
  const newTitle = { companyId, name, hourlyRate };
  const docRef = await jobTitlesCol.add(newTitle);
  return { ...newTitle, id: docRef.id } as JobTitle;
};

// Added missing updateJobTitle function
export const updateJobTitle = async (id: string, updates: Partial<JobTitle>): Promise<void> => {
    await jobTitlesCol.doc(id).update(updates);
};

export const getEmployees = async (companyId: string): Promise<Employee[]> => {
  const snapshot = await employeesCol.where('companyId', '==', companyId).get();
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Employee));
};

const generateDeviceCode = (): string => Math.random().toString(36).substring(2, 7).toUpperCase();

export const addEmployee = async (companyId: string, name: string, username: string, password: string, shiftId?: string, locationId?: string, jobTitleId?: string): Promise<Employee> => {
  const newEmployee: Omit<Employee, 'id'> = {
    companyId,
    name: name.trim(),
    username: username.trim(),
    password,
    deviceCode: generateDeviceCode(),
    shiftId: shiftId || null,
    locationId: locationId || null,
    jobTitleId: jobTitleId || null,
  };
  const docRef = await employeesCol.add(newEmployee);
  return { ...newEmployee, id: docRef.id } as Employee;
};

export const updateEmployee = async (id: string, updates: Partial<Employee>): Promise<void> => {
  await employeesCol.doc(id).update(updates);
};

export const deleteEmployee = async (id: string): Promise<void> => {
  const batch = db.batch();
  batch.delete(employeesCol.doc(id));
  const records = await recordsCol.where("employeeId", "==", id).get();
  records.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
};

export const getAttendanceRecords = async (companyId: string): Promise<AttendanceRecord[]> => {
    const snapshot = await recordsCol.where('companyId', '==', companyId).get();
    return snapshot.docs.map(doc => ({...doc.data(), id: doc.id} as AttendanceRecord))
                   .sort((a, b) => b.timestamp - a.timestamp);
};

// Added missing getRecordsForEmployee function
export const getRecordsForEmployee = async (employeeId: string): Promise<AttendanceRecord[]> => {
    const snapshot = await recordsCol.where('employeeId', '==', employeeId).get();
    return snapshot.docs.map(doc => ({...doc.data(), id: doc.id} as AttendanceRecord))
                   .sort((a, b) => b.timestamp - a.timestamp);
};

export const getLastRecordForEmployee = async (employeeId: string): Promise<AttendanceRecord | null> => {
    const q = recordsCol.where('employeeId', '==', employeeId);
    const snapshot = await q.get();
    const records = snapshot.docs.map(doc => ({...doc.data(), id: doc.id} as AttendanceRecord));
    return records.sort((a, b) => b.timestamp - a.timestamp)[0] || null;
};

export const addAttendanceRecord = async (
  employee: Employee,
  location: Location,
  status: AttendanceStatus,
  coords: { latitude: number; longitude: number; accuracy: number },
  selfieImage?: string
): Promise<AttendanceRecord> => {
  const lastRecord = await getLastRecordForEmployee(employee.id);
  if (status === AttendanceStatus.CHECK_IN && lastRecord?.status === AttendanceStatus.CHECK_IN) throw new Error('Đã check-in rồi.');
  if (status === AttendanceStatus.CHECK_OUT && lastRecord?.status !== AttendanceStatus.CHECK_IN) throw new Error('Chưa check-in.');

  const recordToSave: Omit<AttendanceRecord, 'id'> = {
    companyId: employee.companyId,
    employeeId: employee.id,
    employeeName: employee.name,
    username: employee.username,
    timestamp: Date.now(),
    status,
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy,
    ...(selfieImage && { selfieImage }),
  };

  const docRef = await recordsCol.add(recordToSave);
  return { ...recordToSave, id: docRef.id } as AttendanceRecord;
};

export const addAttendanceRequest = async (employeeId: string, type: AttendanceStatus, reason: string, evidenceImage: string): Promise<AttendanceRequest> => {
  const empSnap = await employeesCol.doc(employeeId).get();
  const emp = empSnap.data() as Employee;
  const req: Omit<AttendanceRequest, 'id'> = {
    companyId: emp.companyId,
    employeeId,
    employeeName: emp.name,
    username: emp.username,
    timestamp: Date.now(),
    type,
    reason,
    evidenceImage,
    status: RequestStatus.PENDING
  };
  const docRef = await requestsCol.add(req);
  return { ...req, id: docRef.id } as AttendanceRequest;
};

export const getAttendanceRequests = async (companyId: string): Promise<AttendanceRequest[]> => {
    const snapshot = await requestsCol.where('companyId', '==', companyId).get();
    return snapshot.docs.map(doc => ({...doc.data(), id: doc.id} as AttendanceRequest))
                   .sort((a, b) => b.timestamp - a.timestamp);
};

export const processAttendanceRequest = async (request: AttendanceRequest, action: 'approve' | 'reject'): Promise<void> => {
    if (action === 'reject') {
        await requestsCol.doc(request.id).update({ status: RequestStatus.REJECTED });
        return;
    }
    const batch = db.batch();
    const record: Omit<AttendanceRecord, 'id'> = {
        companyId: request.companyId,
        employeeId: request.employeeId,
        employeeName: request.employeeName,
        username: request.username,
        timestamp: request.timestamp,
        status: request.type,
        selfieImage: request.evidenceImage,
        isManualEntry: true
    };
    batch.set(recordsCol.doc(), record);
    batch.update(requestsCol.doc(request.id), { status: RequestStatus.APPROVED });
    await batch.commit();
};

export const getInitialData = async (companyId: string) => {
    const [employees, records, shifts, locations, jobTitles, requests] = await Promise.all([
        getEmployees(companyId),
        getAttendanceRecords(companyId),
        getShifts(companyId),
        getLocations(companyId),
        getJobTitles(companyId),
        getAttendanceRequests(companyId),
    ]);
    return { employees, records, shifts, locations, jobTitles, requests, requestsError: null };
};
