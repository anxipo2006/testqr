
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
    
    // Using TinyFaceDetector for speed on mobile devices
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
    
    const detection = await faceapi.detectSingleFace(imageElement, options)
        .withFaceLandmarks()
        .withFaceDescriptor();
        
    return detection;
};

export const matchFace = async (liveDescriptor: Float32Array, storedDescriptorStr: string): Promise<{ isMatch: boolean; distance: number }> => {
    if (!storedDescriptorStr) return { isMatch: false, distance: 1 };

    const storedDescriptor = new Float32Array(Object.values(JSON.parse(storedDescriptorStr)));
    const faceMatcher = new faceapi.FaceMatcher(storedDescriptor, 0.5); // 0.5 is threshold
    const match = faceMatcher.findBestMatch(liveDescriptor);
    
    // face-api returns a match object. If the label is 'unknown', distance was > threshold
    // But we are comparing 1:1, so we look at distance directly.
    // Lower distance = better match. 
    // Typical threshold: 0.6. For high security: 0.45 or 0.5.
    
    return {
        isMatch: match.distance < 0.45, // Strict threshold for attendance
        distance: match.distance
    };
}
