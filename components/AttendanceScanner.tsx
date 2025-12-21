
import React, { useState, useEffect, useRef } from 'react';
import type { Employee, AttendanceRecord, Location } from '../types';
import { AttendanceStatus } from '../types';
import { addAttendanceRecord, getLastRecordForEmployee, getLocationById, addAttendanceRequest } from '../services/attendanceService';
import { matchFace, detectFace, resizeResults, drawFaceBox, checkLivenessAction, LivenessAction } from '../services/faceService';
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
  const [selfieData, setSelfieData] = useState<string | null>(null);

  // Liveness State
  const [livenessChallenge, setLivenessChallenge] = useState<{action: LivenessAction, label: string} | null>(null);

  // Reporting State
  const [reportReason, setReportReason] = useState('');
  
  // Real-time Detection State
  const [showManualCapture, setShowManualCapture] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<any>(null);
  const isProcessingRef = useRef(false); 
  
  // --- STABILITY COUNTER ---
  // Yêu cầu N khung hình liên tiếp hợp lệ mới tính là thành công
  // Giúp loại bỏ các trường hợp nhận diện sai do mờ/nhòe trong tích tắc
  const consecutiveMatchesRef = useRef(0);
  const REQUIRED_STABLE_FRAMES = 3;


  useEffect(() => {
    const determineNextAction = async () => {
      const lastRecord = await getLastRecordForEmployee(employee.id);
      setNextAction(lastRecord?.status === AttendanceStatus.CHECK_IN ? AttendanceStatus.CHECK_OUT : AttendanceStatus.CHECK_IN);
    };
    determineNextAction();
  }, [employee.id, scanState]); 

  // --- CAMERA MANAGEMENT ---

  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
              facingMode: 'user',
              width: { ideal: 640 }, 
              height: { ideal: 480 }
          } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
            if (scanState === 'verifyingFace' && !selfieData) {
                videoRef.current?.play().catch(e => console.error("Play error", e));
                startRealTimeDetection();
                setTimeout(() => setShowManualCapture(true), 15000);
            }
        };
      }
      streamRef.current = stream;
    } catch (err) {
      console.error("Error accessing camera:", err);
      if (scanState === 'verifyingFace' || scanState === 'reporting') {
           showResult('error', undefined, "Không thể truy cập camera. Vui lòng cấp quyền và tải lại trang.");
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
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


  // --- REAL-TIME DETECTION LOOP (With Liveness) ---

  const generateChallenge = () => {
      const actions: {action: LivenessAction, label: string}[] = [
          { action: 'smile', label: 'HÃY CƯỜI LÊN! 😁' },
          { action: 'turnLeft', label: 'QUAY TRÁI ⬅️' },
          { action: 'turnRight', label: 'QUAY PHẢI ➡️' }
      ];
      const random = actions[Math.floor(Math.random() * actions.length)];
      setLivenessChallenge(random);
      consecutiveMatchesRef.current = 0; // Reset counter
  };

  const startRealTimeDetection = () => {
      if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
      consecutiveMatchesRef.current = 0;

      if (employee.faceDescriptor) {
          generateChallenge();
      }

      detectionIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || !canvasRef.current || isProcessingRef.current || !scannedLocation) return;
          
          if (!employee.faceDescriptor) return;

          try {
              if (videoRef.current.readyState !== 4) return;

              const detection = await detectFace(videoRef.current);
              
              if (!videoRef.current || !canvasRef.current) return;

              const canvas = canvasRef.current;
              const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
              
              if (canvas.width !== displaySize.width || canvas.height !== displaySize.height) {
                  canvas.width = displaySize.width;
                  canvas.height = displaySize.height;
              }

              if (detection) {
                  const resizedDetections = resizeResults(detection, displaySize);
                  const matchResult = await matchFace(detection.descriptor, employee.faceDescriptor);
                  
                  let isLivenessPassed = false;
                  let promptText = "Đang xác thực...";

                  if (matchResult.isMatch) {
                      if (livenessChallenge) {
                          promptText = livenessChallenge.label;
                          isLivenessPassed = checkLivenessAction(detection, livenessChallenge.action);
                      } else {
                          promptText = "Giữ yên...";
                      }
                  } else {
                      promptText = "Không đúng người!";
                      // Nếu sai người, reset ngay lập tức
                      consecutiveMatchesRef.current = 0; 
                  }

                  drawFaceBox(canvas, resizedDetections, matchResult.isMatch, promptText);

                  if (matchResult.isMatch && isLivenessPassed) {
                      // Tăng bộ đếm độ ổn định
                      consecutiveMatchesRef.current += 1;
                      
                      // Chỉ chấp nhận khi đã ổn định qua N frame
                      if (consecutiveMatchesRef.current >= REQUIRED_STABLE_FRAMES) {
                          isProcessingRef.current = true;
                          if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
                          
                          const image = captureImage();
                          
                          setProcessingMessage('Xác thực thành công! Đang chấm công...');
                          setScanState('processing');
                          
                          setTimeout(() => {
                              processAttendance(image || undefined);
                          }, 500);
                      }
                  } else {
                      // Nếu match khuôn mặt nhưng chưa làm đúng hành động liveness -> không tăng đếm, nhưng cũng không reset (cho người dùng thời gian phản ứng)
                      // Tuy nhiên nếu KHÔNG match khuôn mặt -> đã reset ở trên.
                      if (!matchResult.isMatch) consecutiveMatchesRef.current = 0;
                  }
              } else {
                  // Không thấy mặt -> reset
                  const ctx = canvas.getContext('2d');
                  ctx?.clearRect(0, 0, canvas.width, canvas.height);
                  consecutiveMatchesRef.current = 0;
              }

          } catch (e) {
              console.error("Detection loop error", e);
          }
      }, 200); 
  };


  // --- HELPERS ---

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
    stopCamera();
    isProcessingRef.current = false;
    
    setTimeout(() => {
      setScanState('idle');
      setErrorMessage('');
      setReceipt(null);
      setSelfieData(null);
      setScannedLocation(null);
      setReportReason('');
      setProcessingMessage('');
      setShowManualCapture(false);
      setLivenessChallenge(null);
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
  
  const processAttendance = async (selfie?: string) => {
     try {
        setProcessingMessage('Đang lấy vị trí của bạn...');
        const position = await getCurrentPosition();
        const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
        };
        
        setProcessingMessage(`Đang xác thực ${nextActionText}...`);
        
        const newRecord = await addAttendanceRecord(employee, nextAction, coords, selfie);

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
        isProcessingRef.current = false;
    }
  }

  const handleScanSuccess = async (locationId: string) => {
    setScanState('processing');
    setProcessingMessage('Đang kiểm tra mã QR...');
    try {
        const location = await getLocationById(locationId);
        if (!location) throw new Error("Mã QR không hợp lệ.");
        
        setScannedLocation(location);

        if (employee.faceDescriptor) {
             setProcessingMessage('Đang tải mô hình AI...');
             setScanState('verifyingFace');
             setShowManualCapture(false);
        } else if (location.requireSelfie) {
             setProcessingMessage('Địa điểm yêu cầu chụp ảnh...');
             setScanState('verifyingFace');
             setShowManualCapture(true); 
        } else {
            await processAttendance();
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
    setShowManualCapture(false);
    setLivenessChallenge(null);
    stopCamera();
    isProcessingRef.current = false;
  }

  const captureImage = (): string | null => {
      if (videoRef.current) {
        const video = videoRef.current;
        if (video.videoWidth === 0 || video.videoHeight === 0) return null;

        const canvas = document.createElement('canvas');
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

  const handleManualCapture = async () => {
      if (!scannedLocation || isProcessingRef.current) return;
      isProcessingRef.current = true;
      if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
      
      const image = captureImage();
      if (!image) {
          isProcessingRef.current = false;
          return;
      }

      setSelfieData(image); 
      setScanState('processing');
      setProcessingMessage('Đang xử lý...');

      try {
          if (employee.faceDescriptor) {
              setProcessingMessage('Đang phân tích kỹ khuôn mặt...');
              const detection = await detectFace(videoRef.current!); 
              if (!detection) {
                  throw new Error("Không tìm thấy khuôn mặt. Hãy thử lại nơi đủ sáng.");
              }
              const matchResult = await matchFace(detection.descriptor, employee.faceDescriptor);
              
              if (!matchResult.isMatch) {
                   throw new Error("Khuôn mặt không khớp. Vui lòng thử lại.");
              }
              await processAttendance(image);
          } else {
              await processAttendance(image);
          }
      } catch (e: any) {
          setSelfieData(null); 
          setScanState('verifyingFace'); 
          alert(e.message); 
          isProcessingRef.current = false;
          startRealTimeDetection(); 
      }
  }

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
            className="w-full px-6 py-4 text-lg font-bold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-transform transform hover:scale-105 flex items-center justify-center gap-3 shadow-lg shadow-primary-500/30"
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
            <button onClick={handleCancel} className="mt-4 w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Hủy</button>
             <StartReportingButton />
        </div>
    );
  }
  
  if (scanState === 'verifyingFace') {
    const hasFaceId = !!employee.faceDescriptor;
    return (
        <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 text-center relative">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {hasFaceId ? 'Xác thực Liveness (Chống gian lận)' : 'Chụp ảnh xác thực'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
                {hasFaceId ? (livenessChallenge ? 'Làm theo hướng dẫn trên màn hình' : 'Đang khởi tạo...') : 'Vui lòng chụp ảnh selfie.'}
            </p>

            <div className="relative w-full aspect-square bg-black rounded-lg overflow-hidden mb-4 shadow-inner">
                 <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1] relative z-10"></video>
                 <canvas ref={canvasRef} className="absolute inset-0 w-full h-full transform scale-x-[-1] z-20"></canvas>
            </div>
            
            {(showManualCapture || !hasFaceId) && (
                 <button onClick={handleManualCapture} className="w-full px-6 py-3 text-lg font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-3 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <CameraIcon className="h-7 w-7"/>
                    {hasFaceId ? 'Không được? Chụp thủ công' : 'Chụp & Chấm công'}
                </button>
            )}

             <button onClick={handleCancel} className="mt-4 w-full text-sm text-gray-600 hover:underline">Hủy bỏ</button>
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
        <div className="w-full p-4 rounded-lg flex flex-col items-center justify-center text-center bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-700 min-h-[290px] animate-in zoom-in duration-300">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mb-3" />
            <h3 className="text-2xl font-bold text-green-800 dark:text-green-200">{isRequest ? 'Đã gửi yêu cầu!' : 'Chấm công thành công!'}</h3>
            <div className="text-left mt-6 space-y-3 text-base text-gray-700 dark:text-gray-300 w-full bg-white/50 dark:bg-black/20 p-4 rounded-lg">
                {!isRequest && (
                    <>
                        <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                            <span className="font-medium">Trạng thái</span>
                            <span className="font-bold text-primary-600">{receipt?.status === AttendanceStatus.CHECK_IN ? 'CHECK-IN' : 'CHECK-OUT'}</span>
                        </div>
                        <div className="flex justify-between pt-2">
                            <span className="font-medium">Thời gian</span>
                            <span>{receipt ? formatTimestamp(receipt.timestamp) : ''}</span>
                        </div>
                    </>
                )}
                 {((receipt && receipt.selfieImage) || (isRequest && selfieData)) && (
                    <div className="flex justify-center pt-4">
                        <img src={receipt?.selfieImage || selfieData || ''} className="h-24 w-24 rounded-full object-cover border-4 border-white shadow-lg" />
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
