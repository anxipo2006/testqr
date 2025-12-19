
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

// --- Company Management ---
export const getCompanies = async (): Promise<Company[]> => {
  const snapshot = await companiesCol.orderBy('createdAt', 'desc').get();
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Company));
};

export const getCompanyById = async (id: string): Promise<Company | null> => {
  const doc = await companiesCol.doc(id).get();
  return doc.exists ? { ...doc.data(), id: doc.id } as Company : null;
};

export const addCompany = async (name: string): Promise<Company> => {
  const newCompany = { name, createdAt: Date.now() };
  const docRef = await companiesCol.add(newCompany);
  return { ...newCompany, id: docRef.id };
};

export const updateCompany = async (id: string, updates: Partial<Company>): Promise<void> => {
  await companiesCol.doc(id).update(updates);
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
    if (credentials.username === 'superadmin' && credentials.password === 'super123') {
      return { id: 'super', companyId: 'super', name: 'Super Admin', username: 'superadmin', password: '', role: 'SUPER_ADMIN' };
    }
    
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

// --- Employee Management ---
export const getEmployees = async (companyId: string): Promise<Employee[]> => {
  const snapshot = await employeesCol.where('companyId', '==', companyId).get();
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Employee));
};

export const addEmployee = async (companyId: string, name: string, username: string, password: string, shiftId?: string, locationId?: string, jobTitleId?: string): Promise<Employee> => {
  const deviceCode = Math.random().toString(36).substring(2, 7).toUpperCase();
  const newEmp: Omit<Employee, 'id'> = {
    companyId,
    name,
    username,
    password,
    deviceCode,
    shiftId: shiftId || null,
    locationId: locationId || null,
    jobTitleId: jobTitleId || null
  };
  const docRef = await employeesCol.add(newEmp);
  return { ...newEmp, id: docRef.id };
};

export const updateEmployee = async (id: string, updates: Partial<Employee>): Promise<void> => {
  await employeesCol.doc(id).update(updates);
};

export const deleteEmployee = async (id: string): Promise<void> => {
  await employeesCol.doc(id).delete();
};

// --- Shift Management ---
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

// --- Location Management ---
export const getLocations = async (companyId: string): Promise<Location[]> => {
  const snapshot = await locationsCol.where('companyId', '==', companyId).get();
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Location));
};

export const getLocationById = async (id: string): Promise<Location | null> => {
  const doc = await locationsCol.doc(id).get();
  return doc.exists ? { ...doc.data(), id: doc.id } as Location : null;
};

export const addLocation = async (companyId: string, location: Omit<Location, 'id' | 'companyId'>): Promise<Location> => {
  const newLoc = { ...location, companyId };
  const docRef = await locationsCol.add(newLoc);
  return { ...newLoc, id: docRef.id } as Location;
};

export const updateLocation = async (id: string, updates: Partial<Location>): Promise<void> => {
  await locationsCol.doc(id).update(updates);
};

export const deleteLocation = async (id: string): Promise<void> => {
  await locationsCol.doc(id).delete();
};

// --- Job Title Management ---
export const getJobTitles = async (companyId: string): Promise<JobTitle[]> => {
  const snapshot = await jobTitlesCol.where('companyId', '==', companyId).get();
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as JobTitle));
};

export const addJobTitle = async (companyId: string, name: string, hourlyRate: number): Promise<JobTitle> => {
  const newJt = { companyId, name, hourlyRate };
  const docRef = await jobTitlesCol.add(newJt);
  return { ...newJt, id: docRef.id } as JobTitle;
};

export const updateJobTitle = async (id: string, updates: Partial<JobTitle>): Promise<void> => {
  await jobTitlesCol.doc(id).update(updates);
};

// --- Attendance Records ---
export const getRecordsForEmployee = async (employeeId: string, limit: number = 50): Promise<AttendanceRecord[]> => {
  const snapshot = await recordsCol.where('employeeId', '==', employeeId).get();
  
  // Sort client-side
  const records = snapshot.docs
    .map(doc => ({ ...doc.data(), id: doc.id } as AttendanceRecord))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
    
  return records;
};

export const getLastRecordForEmployee = async (employeeId: string): Promise<AttendanceRecord | null> => {
  const snapshot = await recordsCol.where('employeeId', '==', employeeId).get();
  if (snapshot.empty) return null;
  const records = snapshot.docs
    .map(doc => ({ ...doc.data(), id: doc.id } as AttendanceRecord))
    .sort((a, b) => b.timestamp - a.timestamp);
  return records[0] || null;
};

export const addAttendanceRecord = async (
  employee: Employee,
  status: AttendanceStatus,
  coords: { latitude: number; longitude: number; accuracy: number },
  selfieImage?: string
): Promise<AttendanceRecord> => {
  const newRecord: Omit<AttendanceRecord, 'id'> = {
    companyId: employee.companyId,
    employeeId: employee.id,
    employeeName: employee.name,
    username: employee.username,
    timestamp: Date.now(),
    status,
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy,
    ...(selfieImage ? { selfieImage } : {})
  };
  const docRef = await recordsCol.add(newRecord);
  return { ...newRecord, id: docRef.id };
};

// --- REAL-TIME SUBSCRIPTION for Admin Dashboard (Logs) ---
export const subscribeToRecentRecords = (companyId: string, onUpdate: (records: AttendanceRecord[]) => void) => {
    // Listen to all records for the company
    // Sorting client-side to avoid index requirement
    return recordsCol
        .where('companyId', '==', companyId)
        .onSnapshot(snapshot => {
             const records = snapshot.docs
                .map(doc => ({ ...doc.data(), id: doc.id } as AttendanceRecord))
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 500); // Only keep latest 500 in memory for the view
             onUpdate(records);
        }, error => {
            console.error("Error subscribing to records:", error);
        });
}

// --- Requests Management ---
export const addAttendanceRequest = async (employeeId: string, type: AttendanceStatus, reason: string, evidenceImage: string): Promise<void> => {
    const empDoc = await employeesCol.doc(employeeId).get();
    const empData = empDoc.data() as Employee;
    
    const newRequest: Omit<AttendanceRequest, 'id'> = {
        companyId: empData.companyId,
        employeeId: empData.id || employeeId,
        employeeName: empData.name,
        username: empData.username,
        timestamp: Date.now(),
        type,
        reason,
        evidenceImage,
        status: RequestStatus.PENDING
    };
    await requestsCol.add(newRequest);
};

export const processAttendanceRequest = async (request: AttendanceRequest, action: 'approve' | 'reject'): Promise<void> => {
    const status = action === 'approve' ? RequestStatus.APPROVED : RequestStatus.REJECTED;
    await requestsCol.doc(request.id).update({ status });
    
    if (action === 'approve') {
        const newRecord: Omit<AttendanceRecord, 'id'> = {
            companyId: request.companyId,
            employeeId: request.employeeId,
            employeeName: request.employeeName,
            username: request.username,
            timestamp: request.timestamp,
            status: request.type,
            isManualEntry: true,
            selfieImage: request.evidenceImage
        };
        await recordsCol.add(newRecord);
    }
};

// --- Dashboard Data Loader ---
export const getInitialData = async (companyId: string) => {
  const [emps, recsSnapshot, shfts, locs, jts, reqsSnapshot] = await Promise.all([
    getEmployees(companyId),
    recordsCol.where('companyId', '==', companyId).get(),
    getShifts(companyId),
    getLocations(companyId),
    getJobTitles(companyId),
    requestsCol.where('companyId', '==', companyId).get()
  ]);

  const records = recsSnapshot.docs
    .map(doc => ({ ...doc.data(), id: doc.id } as AttendanceRecord))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 500);

  const requests = reqsSnapshot.docs
    .map(doc => ({ ...doc.data(), id: doc.id } as AttendanceRequest))
    .sort((a, b) => b.timestamp - a.timestamp);

  return {
    employees: emps,
    records: records,
    shifts: shfts,
    locations: locs,
    jobTitles: jts,
    requests: requests
  };
};
