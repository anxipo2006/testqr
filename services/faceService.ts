
declare const faceapi: any;

const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

let isModelLoaded = false;

export const loadFaceModels = async () => {
  if (isModelLoaded) return;
  
  try {
    console.log("Loading Face API Models...");
    await Promise.all([
      // TinyFaceDetector nhanh nhẹn cho web, nhưng cần config inputSize lớn để chính xác
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
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
    // Tăng inputSize lên 512 (chia hết cho 32). Mặc định là 416.
    // 512 giúp AI nhận diện chi tiết tốt hơn hẳn so với 160 hay 320.
    // scoreThreshold 0.6: Chỉ nhận diện khi AI rất chắc chắn đó là khuôn mặt.
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.6 });
    
    const detection = await faceapi.detectSingleFace(imageElement, options)
        .withFaceLandmarks()
        .withFaceExpressions()
        .withFaceDescriptor();
        
    return detection;
};

// Hàm hỗ trợ resize kết quả detection để vẽ lên canvas
export const resizeResults = (detection: any, size: { width: number, height: number }) => {
    return faceapi.resizeResults(detection, size);
};

// Hàm vẽ khung khuôn mặt
export const drawFaceBox = (canvas: HTMLCanvasElement, detection: any, isMatch: boolean) => {
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

    // KHÔNG VẼ CHỮ Ở ĐÂY NỮA ĐỂ TRÁNH BỊ NGƯỢC (MIRRORED)
    // Chữ sẽ được handle bằng HTML Overlay
};

// Hàm tính khoảng cách Euclidean thuần túy
function euclideanDistance(descriptor1: Float32Array, descriptor2: Float32Array): number {
    if (descriptor1.length !== descriptor2.length) return 1.0; 
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
        const parsed = JSON.parse(storedDescriptorStr);
        // Xử lý linh hoạt cả Array và Object (do Firebase đôi khi lưu dạng object index)
        const storedDescriptor = new Float32Array(Array.isArray(parsed) ? parsed : Object.values(parsed));
        
        const distance = euclideanDistance(liveDescriptor, storedDescriptor);
        
        // --- CẤU HÌNH QUAN TRỌNG ---
        // Threshold càng NHỎ càng KHẮT KHE.
        // 0.6: Mặc định (Dễ dãi, dễ sai)
        // 0.45: Trung bình
        // 0.4: Khắt khe (Khuyên dùng để chống gian lận)
        const threshold = 0.4;

        // console.log(`Distance: ${distance.toFixed(4)} | Threshold: ${threshold} | Match: ${distance < threshold}`);

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
        // Giảm ngưỡng xuống 0.6 để dễ cười hơn
        return detection.expressions.happy > 0.6;
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

    // Ngưỡng quay đầu (Vẫn giữ logic nhưng không gọi tới trong UI nữa)
    if (action === 'turnLeft') {
        return ratio < 0.55; 
    }

    if (action === 'turnRight') {
        return ratio > 1.8;
    }

    return false;
};
