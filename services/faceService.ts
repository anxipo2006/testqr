
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
    
    // TinyFaceDetectorOptions:
    // inputSize: Kích thước càng nhỏ xử lý càng nhanh, nhưng độ chính xác giảm với mặt nhỏ. 224 là chuẩn, 160 là siêu nhanh.
    // scoreThreshold: Ngưỡng tin cậy để coi là khuôn mặt.
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
    
    const detection = await faceapi.detectSingleFace(imageElement, options)
        .withFaceLandmarks()
        .withFaceDescriptor();
        
    return detection;
};

// Hàm tính khoảng cách Euclidean thuần túy (Nhanh hơn FaceMatcher của thư viện)
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
        
        // So sánh trực tiếp bằng toán học, không cần khởi tạo FaceMatcher
        const distance = euclideanDistance(liveDescriptor, storedDescriptor);
        
        // Ngưỡng (Threshold):
        // < 0.4: Rất giống (Chính xác cao)
        // < 0.5: Giống (Mức trung bình cho chấm công)
        // < 0.6: Khá giống (Dễ chấp nhận sai số)
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
