
import React, { useState, useEffect, useRef } from 'react';
import type { Employee, AttendanceRecord, Location } from '../types';
import { AttendanceStatus } from '../types';
import { addAttendanceRecord, getLastRecordForEmployee, getLocationById } from '../services/attendanceService';
import QRScanner from './QRScanner';
import { CheckCircleIcon, XCircleIcon, QrCodeIcon, LoadingIcon, CameraIcon } from './icons';
import { formatTimestamp } from '../utils/date';

interface AttendanceScannerProps {
  employee: Employee;
  onScanComplete: () => Promise<void>;
}

type ScanState = 'idle' | 'scanning' | 'capturingSelfie' | 'processing' | 'success' | 'error';

const AttendanceScanner: React.FC<AttendanceScannerProps> = ({ employee, onScanComplete }) => {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [processingMessage, setProcessingMessage] = useState('');
  const [receipt, setReceipt] = useState<AttendanceRecord | null>(null);
  const [nextAction, setNextAction] = useState<AttendanceStatus>(AttendanceStatus.CHECK_IN);
  
  const [scannedLocation, setScannedLocation] = useState<Location | null>(null);
  const [selfieData, setSelfieData] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);


  useEffect(() => {
    const determineNextAction = async () => {
      const lastRecord = await getLastRecordForEmployee(employee.id);
      setNextAction(lastRecord?.status === AttendanceStatus.CHECK_IN ? AttendanceStatus.CHECK_OUT : AttendanceStatus.CHECK_IN);
    };
    determineNextAction();
  }, [employee.id, scanState]); // Re-check on state change in case of completion

  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
    } catch (err) {
      console.error("Error accessing camera:", err);
      showResult('error', undefined, "Không thể truy cập camera. Vui lòng cấp quyền trong cài đặt trình duyệt.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (scanState === 'capturingSelfie' && !selfieData) {
      startCamera();
    } else {
      stopCamera();
    }
    
    // Cleanup on unmount
    return () => {
        stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanState, selfieData]);


  const nextActionText = nextAction === AttendanceStatus.CHECK_IN ? 'Check-in' : 'Check-out';

  const showResult = (state: 'error' | 'success', record?: AttendanceRecord, message?: string) => {
    setScanState(state);
    if(state === 'success' && record){
        setReceipt(record);
    }
    if (state === 'error' && message) {
        setErrorMessage(message);
    }
    setTimeout(() => {
      setScanState('idle');
      setErrorMessage('');
      setReceipt(null);
      setSelfieData(null);
      setScannedLocation(null);
    }, 5000); // Show result for 5 seconds
  };
  
  const getCurrentPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });
    });
  }
  
  const processAttendance = async (location: Location, selfie?: string) => {
     try {
        setProcessingMessage('Đang lấy vị trí của bạn...');
        const position = await getCurrentPosition();
        const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
        };
        
        setProcessingMessage(`Đang xác thực ${nextActionText}...`);
        const newRecord = await addAttendanceRecord(employee.id, nextAction, location.id, coords, selfie);

        await onScanComplete();
        showResult('success', newRecord);

    } catch (error: any) {
         // Handle Geolocation errors more specifically
        if (error.code && typeof error.code === 'number') {
            switch(error.code) {
            case 1: // PERMISSION_DENIED
                showResult('error', undefined, "Bạn đã từ chối quyền truy cập vị trí. Vui lòng cấp quyền trong cài đặt trình duyệt.");
                break;
            case 2: // POSITION_UNAVAILABLE
                showResult('error', undefined, "Không thể xác định vị trí hiện tại. Vui lòng kiểm tra kết nối mạng và GPS.");
                break;
            case 3: // TIMEOUT
                showResult('error', undefined, "Yêu cầu vị trí đã hết hạn. Vui lòng thử lại.");
                break;
            default:
                showResult('error', undefined, `Lỗi vị trí không xác định (Mã: ${error.code}).`);
                break;
            }
        } else {
            // Handle other errors (e.g., from addAttendanceRecord)
            showResult('error', undefined, error.message || 'Đã xảy ra lỗi không xác định.');
        }
    } finally {
        setProcessingMessage('');
    }
  }

  const handleScanSuccess = async (locationId: string) => {
    setScanState('processing');
    setProcessingMessage('Đang kiểm tra địa điểm...');
    try {
        const location = await getLocationById(locationId);
        if (!location) {
            throw new Error("Mã QR không hợp lệ cho bất kỳ địa điểm nào.");
        }
        
        setScannedLocation(location);

        if (location.requireSelfie) {
            setScanState('capturingSelfie');
        } else {
            await processAttendance(location);
        }

    } catch (error: any) {
        showResult('error', undefined, error.message || 'Lỗi khi xử lý mã QR.');
    }
  };

  const handleScanError = (error: string) => {
    showResult('error', undefined, error);
  };
  
  const handleCancel = () => {
    setScanState('idle');
    setSelfieData(null);
    setScannedLocation(null);
  }

  const handleCaptureSelfie = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        // Flip the image horizontally
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // Compress image
        setSelfieData(dataUrl);
        stopCamera();
      }
    }
  }

  const handleRetakeSelfie = () => {
    setSelfieData(null);
    // The useEffect will restart the camera
  }
  
  const handleConfirmSelfie = () => {
    if (scannedLocation && selfieData) {
        setScanState('processing');
        processAttendance(scannedLocation, selfieData);
    }
  }


  // Idle State: Show the main button
  if (scanState === 'idle') {
    return (
      <button
        onClick={() => setScanState('scanning')}
        className="w-full px-6 py-4 text-lg font-bold text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-transform transform hover:scale-105 flex items-center justify-center gap-3"
      >
        <QrCodeIcon className="h-7 w-7" />
        <span>Quét mã QR để {nextActionText}</span>
      </button>
    );
  }

  // Scanning State: Show the QR Scanner and a cancel button
  if (scanState === 'scanning') {
    return (
        <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-medium text-center text-gray-900 dark:text-white mb-4">Đưa mã QR vào trong khung</h3>
            <div className="rounded-lg overflow-hidden">
                <QRScanner onScanSuccess={handleScanSuccess} onScanError={handleScanError} />
            </div>
            <button onClick={handleCancel} className="mt-4 w-full px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">
                Hủy
            </button>
        </div>
    );
  }
  
  // Capturing Selfie State
  if (scanState === 'capturingSelfie') {
    return (
        <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 text-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Xác thực bằng Selfie</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Vui lòng chụp ảnh chân dung của bạn.</p>

            <div className="relative w-full aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden mb-4">
                {selfieData ? (
                    <img src={selfieData} alt="Selfie preview" className="w-full h-full object-cover" />
                ) : (
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform scale-x-[-1]"></video>
                )}
                <canvas ref={canvasRef} className="hidden"></canvas>
            </div>
            
            {selfieData ? (
                 <div className="flex items-center gap-4">
                    <button onClick={handleRetakeSelfie} className="w-full px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">
                        Chụp lại
                    </button>
                     <button onClick={handleConfirmSelfie} className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
                        Xác nhận
                    </button>
                </div>
            ) : (
                <button onClick={handleCaptureSelfie} className="w-full px-6 py-3 text-lg font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-3">
                    <CameraIcon className="h-7 w-7"/>
                    Chụp ảnh
                </button>
            )}
             <button onClick={handleCancel} className="mt-4 w-full text-sm text-gray-600 dark:text-gray-400 hover:underline">
                Hủy
            </button>
        </div>
    )
  }
  
  if (scanState === 'success' && receipt) {
    return (
        <div className="w-full p-4 rounded-lg flex flex-col items-center justify-center text-center transition-all duration-300 bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-700 min-h-[290px]">
            <CheckCircleIcon className="h-12 w-12 text-green-500 mb-3" />
            <h3 className="text-xl font-bold text-green-800 dark:text-green-200">Chấm công thành công!</h3>
            
            <div className="text-left mt-4 space-y-2 text-sm text-gray-700 dark:text-gray-300 w-full">
                <div className="flex justify-between">
                    <span className="font-semibold">Trạng thái:</span>
                    <span>{receipt.status === AttendanceStatus.CHECK_IN ? 'Check-in' : 'Check-out'}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="font-semibold">Thời gian:</span>
                    <span>{formatTimestamp(receipt.timestamp)}</span>
                </div>
                {receipt.latitude && receipt.longitude && (
                    <div className="flex justify-between items-center">
                        <span className="font-semibold">Vị trí:</span>
                        <a href={`https://www.google.com/maps?q=${receipt.latitude},${receipt.longitude}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
                            <span>Xem trên Bản đồ</span>
                            <span className="text-xs">({receipt.accuracy?.toFixed(0)}m)</span>
                        </a>
                    </div>
                )}
                 {receipt.selfieImage && (
                    <div className="flex justify-center pt-2">
                        <img src={receipt.selfieImage} alt="Selfie" className="h-20 w-20 rounded-full object-cover border-2 border-white dark:border-gray-600 shadow-md" />
                    </div>
                 )}
            </div>
        </div>
    );
  }

  if (scanState === 'error') {
     return (
        <div className={`w-full p-6 rounded-lg flex flex-col items-center justify-center gap-4 text-center transition-all duration-300 h-auto min-h-[290px] bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200`}>
            <XCircleIcon className={`h-16 w-16`} />
            <p className="text-xl font-semibold">
                {errorMessage}
            </p>
        </div>
    );
  }

  // Processing State
  return (
    <div className={`w-full p-6 rounded-lg flex flex-col items-center justify-center gap-4 text-center transition-all duration-300 h-auto min-h-[290px]`}>
        <div className={`p-6 rounded-lg flex flex-col items-center justify-center gap-4 text-center transition-all duration-300 w-full h-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200`}>
            <LoadingIcon className={`h-16 w-16 animate-spin`} />
            <p className="text-xl font-semibold">
                {processingMessage}
            </p>
        </div>
    </div>
  );
};

export default AttendanceScanner;