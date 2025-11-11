import { useState } from 'react';

// Hook để quản lý trạng thái được đồng bộ hóa với localStorage
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // State để lưu trữ giá trị của chúng ta
  // Truyền hàm khởi tạo trạng thái ban đầu để logic chỉ được thực thi một lần
  const [storedValue, setStoredValue] = useState<T>(() => {
    // Ngăn chặn lỗi build phía server nếu window không tồn tại
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      // Lấy giá trị từ local storage bằng key
      const item = window.localStorage.getItem(key);
      // Phân tích cú pháp json đã lưu trữ hoặc, nếu không có, trả về initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // Nếu có lỗi, cũng trả về initialValue
      console.log(error);
      return initialValue;
    }
  });

  // Trả về một phiên bản được bao bọc của hàm setter của useState
  // mà sẽ lưu trữ giá trị mới vào localStorage.
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Cho phép value là một hàm để chúng ta có cùng API như useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      // Lưu trạng thái
      setStoredValue(valueToStore);
      // Lưu vào local storage
      if (typeof window !== 'undefined') {
        if (valueToStore === undefined || valueToStore === null) {
          window.localStorage.removeItem(key);
        } else {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      }
    } catch (error) {
      // Một phiên bản nâng cao hơn sẽ xử lý lỗi này
      console.log(error);
    }
  };

  return [storedValue, setValue];
}
