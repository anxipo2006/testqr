
import { db } from './firebaseConfig';
import type { Product, Order, OrderStatus } from '../types';

const productsCol = db.collection('products');
const ordersCol = db.collection('orders');

// --- Product Management ---

export const getProducts = async (): Promise<Product[]> => {
    try {
        const snapshot = await productsCol.where('isAvailable', '==', true).get();
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
    } catch (error) {
        console.error("Error fetching products:", error);
        return [];
    }
};

export const getAllProducts = async (): Promise<Product[]> => {
     const snapshot = await productsCol.get();
     return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
}

export const addProduct = async (product: Omit<Product, 'id'>): Promise<Product> => {
    const docRef = await productsCol.add(product);
    return { ...product, id: docRef.id };
};

export const updateProduct = async (id: string, updates: Partial<Product>): Promise<void> => {
    await productsCol.doc(id).update(updates);
};

export const deleteProduct = async (id: string): Promise<void> => {
    await productsCol.doc(id).delete();
};

// --- Order Management ---

export const createOrder = async (order: Omit<Order, 'id'>): Promise<Order> => {
    const docRef = await ordersCol.add(order);
    return { ...order, id: docRef.id };
};

export const getOrders = async (limit: number = 50): Promise<Order[]> => {
    const snapshot = await ordersCol.orderBy('timestamp', 'desc').limit(limit).get();
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order));
};

export const getActiveOrders = async (): Promise<Order[]> => {
    // Note: In a real app, you need a composite index for status + timestamp
    // Here we just fetch active ones
    const snapshot = await ordersCol.where('status', 'in', ['PENDING', 'PREPARING']).get();
    const orders = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order));
    return orders.sort((a, b) => b.timestamp - a.timestamp);
}

export const updateOrderStatus = async (id: string, status: OrderStatus): Promise<void> => {
    await ordersCol.doc(id).update({ status });
};
