
declare const faceapi: any;

const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

let isModelLoaded = false;

export const loadFaceModels = async () => {
  if (isModelLoaded) return;
  
  try {
    console.log("Loading Face API Models...");
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL), // Load model cảm xúc để check cười
    ]);
    isModelLoaded = true;
    console.log("Face API Models Loaded");
  } catch (error) {
    console.error("Error loading face models:", error);
    throw new Error("Không thể tải dữ liệu nhận diện khuôn mặt. Vui lòng kiểm tra kết nối mạng.");
  }
};

export const detectFace = async (imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement) => {
    if (!isModelLoaded) await loadFaceModels();
    
    // TỐI ƯU HÓA QUAN TRỌNG:
    // Tăng inputSize từ 160 lên 320 để nhận diện chính xác hơn.
    // 160 quá nhỏ dẫn đến sai số cao (ai cũng giống ai).
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
    
    const detection = await faceapi.detectSingleFace(imageElement, options)
        .withFaceLandmarks()
        .withFaceExpressions() // Lấy thêm thông tin biểu cảm
        .withFaceDescriptor();
        
    return detection;
};

// Hàm hỗ trợ resize kết quả detection để vẽ lên canvas
export const resizeResults = (detection: any, size: { width: number, height: number }) => {
    return faceapi.resizeResults(detection, size);
};

// Hàm vẽ khung khuôn mặt
export const drawFaceBox = (canvas: HTMLCanvasElement, detection: any, isMatch: boolean, livenessPrompt?: string) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Xóa canvas cũ
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Lấy box
    const box = detection.detection.box;
    
    // Vẽ khung
    ctx.strokeStyle = isMatch ? '#10b981' : '#ef4444'; // Xanh nếu khớp, Đỏ nếu không
    ctx.lineWidth = 4;
    ctx.strokeRect(box.x, box.y, box.width, box.height);

    // Vẽ nền mờ cho chữ
    ctx.fillStyle = isMatch ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)';
    ctx.fillRect(box.x, box.y - 40, box.width, 40);

    // Vẽ chữ thông báo trạng thái
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    
    let text = isMatch ? "Khuôn mặt hợp lệ" : "Không đúng người";
    if (isMatch && livenessPrompt) {
        text = livenessPrompt; // Hiển thị yêu cầu: Cười lên, Quay trái...
    }
    
    ctx.fillText(text, box.x + box.width / 2, box.y - 15);
};

// Hàm tính khoảng cách Euclidean thuần túy
function euclideanDistance(descriptor1: Float32Array, descriptor2: Float32Array): number {
    if (descriptor1.length !== descriptor2.length) return 1.0; // Fail safe
    let sum = 0;
    for (let i = 0; i < descriptor1.length; i++) {
        const diff = descriptor1[i] - descriptor2[i];
        sum += diff * diff;
    }
    return Math.sqrt(sum);
}

export const matchFace = async (liveDescriptor: Float32Array, storedDescriptorStr: string): Promise<{ isMatch: boolean; distance: number }> => {
    if (!storedDescriptorStr) return { isMatch: false, distance: 1 };

    try {
        // Parse an toàn hơn: Xử lý cả trường hợp mảng JSON lẫn Object Firebase
        const parsed = JSON.parse(storedDescriptorStr);
        const storedDescriptor = new Float32Array(Array.isArray(parsed) ? parsed : Object.values(parsed));
        
        const distance = euclideanDistance(liveDescriptor, storedDescriptor);
        
        // Ngưỡng (Threshold): 
        // 0.6 là chuẩn. 0.5 là khá chặt. 
        // Đặt 0.45 để đảm bảo không nhận nhầm người lạ (chấp nhận việc nhân viên chính chủ có thể phải thử lại 1-2 lần)
        const threshold = 0.45;

        // console.log("Distance:", distance); // Debug distance

        return {
            isMatch: distance < threshold,
            distance: distance
        };
    } catch (e) {
        console.error("Lỗi so sánh khuôn mặt:", e);
        return { isMatch: false, distance: 1 };
    }
}

// --- LIVENESS CHECK LOGIC ---

export type LivenessAction = 'smile' | 'turnLeft' | 'turnRight';

export const checkLivenessAction = (detection: any, action: LivenessAction): boolean => {
    if (!detection) return false;

    if (action === 'smile') {
        // Kiểm tra biểu cảm vui vẻ (happy) > 0.7
        return detection.expressions.happy > 0.7;
    }

    const landmarks = detection.landmarks;
    const nose = landmarks.getNose()[3]; // Đỉnh mũi
    const jaw = landmarks.getJawOutline();
    const leftJaw = jaw[0];
    const rightJaw = jaw[16];

    // Tính khoảng cách từ mũi đến 2 bên hàm
    const distToLeft = Math.abs(nose.x - leftJaw.x);
    const distToRight = Math.abs(nose.x - rightJaw.x);
    const ratio = distToLeft / distToRight;

    if (action === 'turnLeft') {
        // Quay trái: Mũi gần má trái hơn (ratio < 1)
        return ratio < 0.6; 
    }

    if (action === 'turnRight') {
        // Quay phải: Mũi gần má phải hơn (ratio > 1)
        return ratio > 1.6;
    }

    return false;
};
