
import React, { useState, useEffect, useRef } from 'react';
import type { Employee, AttendanceRecord, Location } from '../types';
import { AttendanceStatus } from '../types';
import { addAttendanceRecord, getLastRecordForEmployee, getLocationById, addAttendanceRequest } from '../services/attendanceService';
import { matchFace, detectFace } from '../services/faceService';
import QRScanner from './QRScanner';
import { CheckCircleIcon, XCircleIcon, QrCodeIcon, LoadingIcon, CameraIcon, ExclamationTriangleIcon } from './icons';
import { formatTimestamp } from '../utils/date';

interface AttendanceScannerProps {
  employee: Employee;
  onScanComplete: () => Promise<void>;
}

type ScanState = 'idle' | 'scanning' | 'verifyingFace' | 'processing' | 'success' | 'error' | 'reporting';

const AttendanceScanner: React.FC<AttendanceScannerProps> = ({ employee, onScanComplete }) => {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [processingMessage, setProcessingMessage] = useState('');
  const [receipt, setReceipt] = useState<AttendanceRecord | null>(null);
  const [nextAction, setNextAction] = useState<AttendanceStatus>(AttendanceStatus.CHECK_IN);
  
  const [scannedLocation, setScannedLocation] = useState<Location | null>(null);
  const [selfieData, setSelfieData] = useState<string | null>(null); // Captured image for display/storage

  // Reporting State
  const [reportReason, setReportReason] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);


  useEffect(() => {
    const determineNextAction = async () => {
      const lastRecord = await getLastRecordForEmployee(employee.id);
      setNextAction(lastRecord?.status === AttendanceStatus.CHECK_IN ? AttendanceStatus.CHECK_OUT : AttendanceStatus.CHECK_IN);
    };
    determineNextAction();
  }, [employee.id, scanState]); 

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
      if (scanState === 'verifyingFace' || scanState === 'reporting') {
           showResult('error', undefined, "Không thể truy cập camera. Vui lòng cấp quyền trong cài đặt trình duyệt.");
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if ((scanState === 'verifyingFace' || scanState === 'reporting') && !selfieData) {
      startCamera();
    } else {
      stopCamera();
    }
    
    return () => stopCamera();
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
    if (state === 'success' && message) {
         setProcessingMessage(message); 
    }
    setTimeout(() => {
      setScanState('idle');
      setErrorMessage('');
      setReceipt(null);
      setSelfieData(null);
      setScannedLocation(null);
      setReportReason('');
      setProcessingMessage('');
    }, 5000); 
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
        
        // OPTIMIZED: Pass employee and location objects directly
        const newRecord = await addAttendanceRecord(employee, location, nextAction, coords, selfie);

        await onScanComplete();
        showResult('success', newRecord);

    } catch (error: any) {
        if (error.code && typeof error.code === 'number') {
            switch(error.code) {
            case 1: showResult('error', undefined, "Bạn đã từ chối quyền truy cập vị trí."); break;
            case 2: showResult('error', undefined, "Không thể xác định vị trí hiện tại."); break;
            case 3: showResult('error', undefined, "Yêu cầu vị trí đã hết hạn."); break;
            default: showResult('error', undefined, `Lỗi vị trí: ${error.code}`); break;
            }
        } else {
            showResult('error', undefined, error.message || 'Đã xảy ra lỗi không xác định.');
        }
    } finally {
        setProcessingMessage('');
    }
  }

  const handleScanSuccess = async (locationId: string) => {
    setScanState('processing');
    setProcessingMessage('Đang kiểm tra mã QR...');
    try {
        const location = await getLocationById(locationId);
        if (!location) throw new Error("Mã QR không hợp lệ.");
        
        setScannedLocation(location);

        // Always require Face Check if stored, otherwise Fallback to simple Selfie if required by Location
        if (employee.faceDescriptor) {
             setProcessingMessage('Vui lòng xác thực khuôn mặt...');
             setScanState('verifyingFace');
        } else if (location.requireSelfie) {
             setProcessingMessage('Địa điểm yêu cầu chụp ảnh...');
             setScanState('verifyingFace'); // Reuse UI for selfie
        } else {
            // No face ID and no selfie req -> Go straight
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
    setReportReason('');
  }

  const captureImage = (): string | null => {
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        if (context) {
            context.translate(canvas.width, 0);
            context.scale(-1, 1);
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL('image/jpeg', 0.8);
        }
    }
    return null;
  }

  const handleVerifyFace = async () => {
      if (!scannedLocation) return;
      if (!videoRef.current) return;
      
      const image = captureImage();
      if (!image) return;

      // Visual feedback
      setSelfieData(image); 
      setScanState('processing');
      setProcessingMessage('Đang phân tích khuôn mặt...');

      // Allow UI to update before blocking with heavy calculation
      setTimeout(async () => {
          try {
              // If employee has Face ID registered, verify it
              if (employee.faceDescriptor) {
                  const detection = await detectFace(videoRef.current!); // Use ! because we checked videoRef.current above, but inside setTimeout TS loses context
                  if (!detection) {
                      throw new Error("Không tìm thấy khuôn mặt. Vui lòng thử lại.");
                  }
                  const matchResult = await matchFace(detection.descriptor, employee.faceDescriptor);
                  
                  if (!matchResult.isMatch) {
                       throw new Error("Khuôn mặt không khớp! Vui lòng thử lại hoặc liên hệ quản trị viên.");
                  }
                  
                  setProcessingMessage('Xác thực thành công! Đang lưu...');
                  // No need to wait for state update, call directly
                  await processAttendance(scannedLocation, image);
              } else {
                  // Just a selfie requirement, no verification
                  await processAttendance(scannedLocation, image);
              }
          } catch (e: any) {
              setSelfieData(null); 
              setScanState('verifyingFace'); 
              alert(e.message); 
          }
      }, 50);
  }

  // --- REPORTING LOGIC ---
  const handleCaptureSelfieForReport = () => {
      const img = captureImage();
      if(img) {
          setSelfieData(img);
          stopCamera();
      }
  }

  const handleSubmitReport = async () => {
      if (!reportReason.trim()) {
          alert("Vui lòng nhập lý do.");
          return;
      }
      if (!selfieData) {
          alert("Vui lòng chụp ảnh bằng chứng.");
          return;
      }

      setScanState('processing');
      setProcessingMessage('Đang gửi yêu cầu...');
      try {
          await addAttendanceRequest(employee.id, nextAction, reportReason, selfieData);
          showResult('success', undefined, "Yêu cầu đã được gửi thành công!");
      } catch (e: any) {
          showResult('error', undefined, e.message || "Không thể gửi yêu cầu.");
      }
  }

  // --- RENDER ---

  const StartReportingButton = () => (
      <button 
        onClick={() => { setScanState('reporting'); setErrorMessage(''); }}
        className="mt-6 flex items-center justify-center gap-2 text-sm text-red-600 hover:text-red-800 font-medium border border-red-200 hover:border-red-400 dark:border-red-900 rounded-md py-2 px-4 w-full transition-colors"
      >
        <ExclamationTriangleIcon className="h-4 w-4" />
        Gặp sự cố? Gửi yêu cầu
      </button>
  );

  if (scanState === 'idle') {
    return (
      <div className="w-full">
        <button
            onClick={() => setScanState('scanning')}
            className="w-full px-6 py-4 text-lg font-bold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-transform transform hover:scale-105 flex items-center justify-center gap-3"
        >
            <QrCodeIcon className="h-7 w-7" />
            <span>Quét mã QR để {nextActionText}</span>
        </button>
        <StartReportingButton />
      </div>
    );
  }

  if (scanState === 'scanning') {
    return (
        <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-medium text-center text-gray-900 dark:text-white mb-4">Đưa mã QR vào trong khung</h3>
            <div className="rounded-lg overflow-hidden">
                <QRScanner onScanSuccess={handleScanSuccess} onScanError={handleScanError} />
            </div>
            <button onClick={handleCancel} className="mt-4 w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md">Hủy</button>
             <StartReportingButton />
        </div>
    );
  }
  
  if (scanState === 'verifyingFace') {
    const hasFaceId = !!employee.faceDescriptor;
    return (
        <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 text-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {hasFaceId ? 'Xác thực khuôn mặt' : 'Chụp ảnh xác thực'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
                {hasFaceId ? 'Giữ khuôn mặt ở giữa khung hình để hệ thống nhận diện.' : 'Vui lòng chụp ảnh selfie.'}
            </p>

            <div className="relative w-full aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden mb-4">
                 <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]"></video>
                 {hasFaceId && <div className="absolute inset-0 border-2 border-dashed border-green-400 opacity-60 m-12 rounded-full animate-pulse"></div>}
                 <canvas ref={canvasRef} className="hidden"></canvas>
            </div>
            
            <button onClick={handleVerifyFace} className="w-full px-6 py-3 text-lg font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-3">
                <CameraIcon className="h-7 w-7"/>
                {hasFaceId ? 'Quét & Chấm công' : 'Chụp & Chấm công'}
            </button>
             <button onClick={handleCancel} className="mt-4 w-full text-sm text-gray-600 hover:underline">Hủy</button>
        </div>
    )
  }

  if (scanState === 'reporting') {
      return (
        <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4">
             <h3 className="text-lg font-medium text-center text-red-600 mb-4">Gửi yêu cầu {nextActionText}</h3>
             <div className="relative w-full aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden mb-4">
                {selfieData ? (
                    <img src={selfieData} alt="Selfie" className="w-full h-full object-cover" />
                ) : (
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform scale-x-[-1]"></video>
                )}
                <canvas ref={canvasRef} className="hidden"></canvas>
                {!selfieData && (
                     <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                        <button onClick={handleCaptureSelfieForReport} className="bg-white/90 p-3 rounded-full shadow-lg">
                            <CameraIcon className="h-8 w-8 text-primary-600" />
                        </button>
                     </div>
                )}
                 {selfieData && (
                     <div className="absolute top-2 right-2">
                        <button onClick={() => setSelfieData(null)} className="bg-black/50 text-white px-3 py-1 rounded text-xs">Chụp lại</button>
                     </div>
                )}
            </div>
            <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Lý do:</label>
                <textarea 
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:text-white text-sm"
                    rows={3}
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Nhập lý do..."
                ></textarea>
            </div>
            <div className="flex gap-3">
                 <button onClick={handleCancel} className="flex-1 py-2 bg-gray-200 rounded-md">Hủy</button>
                <button 
                    onClick={handleSubmitReport} 
                    disabled={!selfieData || !reportReason.trim()}
                    className="flex-1 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-300"
                >
                    Gửi
                </button>
            </div>
        </div>
      )
  }
  
  if (scanState === 'success') {
    const isRequest = !receipt; 
    return (
        <div className="w-full p-4 rounded-lg flex flex-col items-center justify-center text-center bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-700 min-h-[290px]">
            <CheckCircleIcon className="h-12 w-12 text-green-500 mb-3" />
            <h3 className="text-xl font-bold text-green-800 dark:text-green-200">{isRequest ? 'Đã gửi yêu cầu!' : 'Chấm công thành công!'}</h3>
            <div className="text-left mt-4 space-y-2 text-sm text-gray-700 dark:text-gray-300 w-full">
                {!isRequest && (
                    <>
                        <div className="flex justify-between"><span>Trạng thái:</span><span>{receipt?.status === AttendanceStatus.CHECK_IN ? 'Check-in' : 'Check-out'}</span></div>
                        <div className="flex justify-between"><span>Thời gian:</span><span>{receipt ? formatTimestamp(receipt.timestamp) : ''}</span></div>
                    </>
                )}
                 {((receipt && receipt.selfieImage) || (isRequest && selfieData)) && (
                    <div className="flex justify-center pt-2">
                        <img src={receipt?.selfieImage || selfieData || ''} className="h-20 w-20 rounded-full object-cover border-2 border-white shadow-md" />
                    </div>
                 )}
            </div>
        </div>
    );
  }

  if (scanState === 'error') {
     return (
        <div className="w-full p-6 rounded-lg flex flex-col items-center justify-center gap-4 text-center bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 min-h-[290px]">
            <XCircleIcon className="h-16 w-16" />
            <p className="text-xl font-semibold">{errorMessage}</p>
            <StartReportingButton />
        </div>
    );
  }

  return (
    <div className="w-full p-6 rounded-lg flex flex-col items-center justify-center gap-4 text-center bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 min-h-[290px]">
        <LoadingIcon className="h-16 w-16 animate-spin" />
        <p className="text-xl font-semibold">{processingMessage}</p>
    </div>
  );
};

export default AttendanceScanner;
