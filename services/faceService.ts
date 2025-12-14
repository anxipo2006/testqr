
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
    // inputSize: 160 (giảm từ 224). Giúp xử lý nhanh hơn đáng kể trên mobile/tablet.
    // scoreThreshold: 0.5. Chỉ nhận diện nếu chắc chắn > 50% là khuôn mặt.
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.5 });
    
    const detection = await faceapi.detectSingleFace(imageElement, options)
        .withFaceLandmarks()
        .withFaceDescriptor();
        
    return detection;
};

// Hàm hỗ trợ resize kết quả detection để vẽ lên canvas (cho khớp với kích thước video hiển thị)
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

    // Vẽ nền mờ cho chữ
    ctx.fillStyle = isMatch ? '#10b981' : '#ef4444';
    ctx.fillRect(box.x, box.y - 30, box.width, 30);

    // Vẽ chữ
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(isMatch ? "OK - Đang chấm công..." : "Không khớp", box.x + 10, box.y - 10);
};

// Hàm tính khoảng cách Euclidean thuần túy
function euclideanDistance(descriptor1: Float32Array, descriptor2: Float32Array): number {
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
        const storedDescriptor = new Float32Array(Object.values(JSON.parse(storedDescriptorStr)));
        const distance = euclideanDistance(liveDescriptor, storedDescriptor);
        
        // Ngưỡng (Threshold): 0.5
        const threshold = 0.5;

        return {
            isMatch: distance < threshold,
            distance: distance
        };
    } catch (e) {
        console.error("Lỗi so sánh khuôn mặt:", e);
        return { isMatch: false, distance: 1 };
    }
}
