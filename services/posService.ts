
import { db } from './firebaseConfig';
import type { Product, Order, OrderStatus } from '../types';

const productsCol = db.collection('products');
const ordersCol = db.collection('orders');

// --- Product Management ---

export const getProducts = async (companyId: string): Promise<Product[]> => {
    try {
        const snapshot = await productsCol.where('companyId', '==', companyId).where('isAvailable', '==', true).get();
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
    } catch (error) {
        console.error("Error fetching products:", error);
        return [];
    }
};

export const getAllProducts = async (companyId: string): Promise<Product[]> => {
     const snapshot = await productsCol.where('companyId', '==', companyId).get();
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

export const getOrders = async (companyId: string, limit: number = 50): Promise<Order[]> => {
    // Removed orderBy to prevent index error
    const snapshot = await ordersCol.where('companyId', '==', companyId).get();
    
    // Sort client-side
    const orders = snapshot.docs
        .map(doc => ({ ...doc.data(), id: doc.id } as Order))
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
        
    return orders;
};

export const getActiveOrders = async (companyId: string): Promise<Order[]> => {
    // 'in' query works fine with simple equality checks usually, but combined with sort might cause issues
    // We will fetch active statuses and sort in memory
    const snapshot = await ordersCol.where('companyId', '==', companyId).where('status', 'in', ['PENDING', 'PREPARING']).get();
    
    const orders = snapshot.docs
        .map(doc => ({ ...doc.data(), id: doc.id } as Order))
        .sort((a, b) => b.timestamp - a.timestamp);
        
    return orders;
}

export const updateOrderStatus = async (id: string, status: OrderStatus): Promise<void> => {
    await ordersCol.doc(id).update({ status });
};

export const getAllOrdersHistory = async (companyId: string): Promise<Order[]> => {
    // Removed orderBy to prevent index error
    const snapshot = await ordersCol.where('companyId', '==', companyId).get();
    
    // Sort and limit client-side
    const orders = snapshot.docs
        .map(doc => ({ ...doc.data(), id: doc.id } as Order))
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 500);
        
    return orders;
}
