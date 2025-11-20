
import React, { useState, useEffect } from 'react';
import { getAllProducts, addProduct, updateProduct, deleteProduct, createOrder, getActiveOrders, updateOrderStatus } from '../services/posService';
import type { Product, Order, OrderItem } from '../types';
import { OrderStatus } from '../types';
import { CubeIcon, PencilIcon, ShoppingBagIcon, LoadingIcon, BanknotesIcon, ClockIcon, CheckCircleIcon, XCircleIcon, ArrowPathIcon } from './icons';
import { formatTimestamp } from '../utils/date';

// --- Sub-components ---

// 1. Menu Manager
const MenuManager: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [category, setCategory] = useState('Coffee');
    const [imageUrl, setImageUrl] = useState('');

    const loadProducts = async () => {
        setIsLoading(true);
        const data = await getAllProducts();
        setProducts(data);
        setIsLoading(false);
    };

    useEffect(() => {
        loadProducts();
    }, []);

    const handleOpenModal = (product?: Product) => {
        if (product) {
            setEditingProduct(product);
            setName(product.name);
            setPrice(product.price.toString());
            setCategory(product.category);
            setImageUrl(product.imageUrl || '');
        } else {
            setEditingProduct(null);
            setName('');
            setPrice('');
            setCategory('Coffee');
            setImageUrl('');
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const productData = {
            name,
            price: parseFloat(price),
            category,
            imageUrl,
            isAvailable: true
        };

        try {
            if (editingProduct) {
                await updateProduct(editingProduct.id, productData);
            } else {
                await addProduct(productData);
            }
            setIsModalOpen(false);
            loadProducts();
        } catch (error) {
            alert("Lỗi lưu sản phẩm");
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Bạn chắc chắn muốn xóa món này?")) {
            await deleteProduct(id);
            loadProducts();
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Quản lý Thực đơn</h2>
                <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 flex items-center gap-2">
                    <CubeIcon className="h-5 w-5" /> Thêm món
                </button>
            </div>

            {isLoading ? <LoadingIcon className="h-8 w-8 mx-auto text-primary-500" /> : (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {products.map(p => (
                        <div key={p.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden group">
                            <div className="h-40 bg-gray-200 dark:bg-gray-700 relative">
                                {p.imageUrl ? (
                                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400"><CubeIcon className="h-12 w-12"/></div>
                                )}
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleOpenModal(p)} className="p-2 bg-white text-gray-700 rounded-full shadow hover:bg-gray-100"><PencilIcon className="h-4 w-4"/></button>
                                </div>
                            </div>
                            <div className="p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white">{p.name}</h3>
                                        <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full">{p.category}</span>
                                    </div>
                                    <span className="font-bold text-primary-600">{new Intl.NumberFormat('vi-VN').format(p.price)}đ</span>
                                </div>
                                <button onClick={() => handleDelete(p.id)} className="mt-4 w-full text-xs text-red-500 hover:underline">Xóa món</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">{editingProduct ? 'Sửa món' : 'Thêm món mới'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Tên món</label>
                                <input className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={name} onChange={e => setName(e.target.value)} required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Giá (VNĐ)</label>
                                <input type="number" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={price} onChange={e => setPrice(e.target.value)} required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Danh mục</label>
                                <select className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={category} onChange={e => setCategory(e.target.value)}>
                                    <option value="Coffee">Cà phê</option>
                                    <option value="Tea">Trà</option>
                                    <option value="Juice">Nước ép</option>
                                    <option value="Food">Đồ ăn</option>
                                    <option value="Other">Khác</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Link ảnh (Optional)</label>
                                <input className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." />
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded text-gray-800">Hủy</button>
                                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded">Lưu</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// 2. POS Terminal
const POSTerminal: React.FC<{ currentUser?: { name: string; id?: string } }> = ({ currentUser }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<OrderItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('All');

    useEffect(() => {
        const load = async () => {
            const data = await getAllProducts();
            setProducts(data.filter(p => p.isAvailable));
        }
        load();
    }, []);

    const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];
    const filteredProducts = selectedCategory === 'All' ? products : products.filter(p => p.category === selectedCategory);

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.productId === product.id);
            if (existing) {
                return prev.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { productId: product.id, productName: product.name, price: product.price, quantity: 1 }];
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.productId !== productId));
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => {
            return prev.map(item => {
                if (item.productId === productId) {
                    const newQty = item.quantity + delta;
                    return newQty > 0 ? { ...item, quantity: newQty } : item;
                }
                return item;
            });
        });
    };

    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        if (!confirm(`Xác nhận thanh toán ${new Intl.NumberFormat('vi-VN').format(totalAmount)}đ?`)) return;

        try {
            await createOrder({
                timestamp: Date.now(),
                items: cart,
                totalAmount,
                status: OrderStatus.PENDING,
                paymentMethod: 'CASH',
                staffName: currentUser?.name || 'Admin',
                staffId: currentUser?.id
            });
            setCart([]);
            alert("Đơn hàng đã được tạo thành công!");
        } catch (error) {
            alert("Lỗi tạo đơn hàng");
        }
    };

    return (
        <div className="flex h-[calc(100vh-100px)] overflow-hidden">
            {/* Left: Product Grid */}
            <div className="flex-1 p-4 overflow-y-auto bg-gray-100 dark:bg-gray-900">
                {/* Category Filter */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${selectedCategory === cat ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Products */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredProducts.map(p => (
                        <div 
                            key={p.id} 
                            onClick={() => addToCart(p)}
                            className="bg-white dark:bg-gray-800 rounded-lg shadow cursor-pointer hover:ring-2 ring-primary-500 transition-all"
                        >
                            <div className="h-32 bg-gray-200 dark:bg-gray-700">
                                {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover rounded-t-lg" /> : null}
                            </div>
                            <div className="p-3">
                                <p className="font-bold text-gray-800 dark:text-white truncate">{p.name}</p>
                                <p className="text-primary-600 font-medium">{new Intl.NumberFormat('vi-VN').format(p.price)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right: Cart */}
            <div className="w-96 bg-white dark:bg-gray-800 shadow-xl flex flex-col border-l dark:border-gray-700">
                <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                    <h2 className="font-bold text-lg flex items-center gap-2"><ShoppingBagIcon className="h-5 w-5"/> Giỏ hàng ({currentUser?.name || 'Admin'})</h2>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.length === 0 ? (
                        <div className="text-center text-gray-500 mt-10">Giỏ hàng trống</div>
                    ) : (
                        cart.map(item => (
                            <div key={item.productId} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                                <div className="flex-1">
                                    <p className="font-medium text-sm dark:text-white">{item.productName}</p>
                                    <p className="text-xs text-gray-500">{new Intl.NumberFormat('vi-VN').format(item.price)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => updateQuantity(item.productId, -1)} className="w-6 h-6 bg-gray-200 rounded text-center leading-none hover:bg-gray-300">-</button>
                                    <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.productId, 1)} className="w-6 h-6 bg-gray-200 rounded text-center leading-none hover:bg-gray-300">+</button>
                                </div>
                                <button onClick={() => removeFromCart(item.productId)} className="ml-2 text-red-500"><XCircleIcon className="h-5 w-5"/></button>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                    <div className="flex justify-between mb-4 text-lg font-bold dark:text-white">
                        <span>Tổng cộng:</span>
                        <span className="text-primary-600">{new Intl.NumberFormat('vi-VN').format(totalAmount)}đ</span>
                    </div>
                    <button 
                        onClick={handleCheckout}
                        disabled={cart.length === 0}
                        className="w-full py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-400 flex justify-center items-center gap-2"
                    >
                        <BanknotesIcon className="h-5 w-5"/> Thanh toán
                    </button>
                </div>
            </div>
        </div>
    );
};

// 3. Order List (Kitchen View)
const OrderList: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadOrders = async () => {
        setIsLoading(true);
        const data = await getActiveOrders();
        setOrders(data);
        setIsLoading(false);
    };

    useEffect(() => {
        loadOrders();
        const interval = setInterval(loadOrders, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const handleStatusChange = async (id: string, newStatus: OrderStatus) => {
        await updateOrderStatus(id, newStatus);
        loadOrders();
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Đơn hàng hiện tại (Bếp/Bar)</h2>
                <button onClick={loadOrders} className="text-primary-600 hover:underline"><ArrowPathIcon className="h-5 w-5"/></button>
            </div>

            {isLoading ? <LoadingIcon className="h-8 w-8 mx-auto" /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {orders.length === 0 && <p className="col-span-3 text-center text-gray-500">Không có đơn hàng nào đang xử lý.</p>}
                    
                    {orders.map(order => (
                        <div key={order.id} className="bg-white dark:bg-gray-800 rounded-lg shadow border-l-4 border-yellow-500 p-4">
                            <div className="flex justify-between mb-2">
                                <span className="font-mono text-xs text-gray-500">#{order.id.slice(-4)}</span>
                                <span className="text-xs text-gray-500">
                                    {formatTimestamp(order.timestamp)}
                                    <br/>
                                    NV: {order.staffName || 'N/A'}
                                </span>
                            </div>
                            <div className="mb-4">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between py-1 border-b border-dashed border-gray-200 dark:border-gray-700 last:border-0">
                                        <span className="font-bold dark:text-gray-200">{item.quantity}x {item.productName}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2 mt-4">
                                {order.status === OrderStatus.PENDING && (
                                    <button onClick={() => handleStatusChange(order.id, OrderStatus.PREPARING)} className="flex-1 py-2 bg-blue-600 text-white rounded text-sm">Bắt đầu làm</button>
                                )}
                                {order.status === OrderStatus.PREPARING && (
                                    <button onClick={() => handleStatusChange(order.id, OrderStatus.COMPLETED)} className="flex-1 py-2 bg-green-600 text-white rounded text-sm">Hoàn thành</button>
                                )}
                                <button onClick={() => handleStatusChange(order.id, OrderStatus.CANCELLED)} className="px-3 py-2 bg-gray-200 text-gray-700 rounded text-sm">Hủy</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export { MenuManager, POSTerminal, OrderList };
