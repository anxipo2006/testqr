
import React, { useState, useEffect } from 'react';
import { getAllProducts, addProduct, updateProduct, deleteProduct, createOrder, subscribeToActiveOrders, updateOrderStatus } from '../services/posService';
import type { Product, Order, OrderItem } from '../types';
import { OrderStatus } from '../types';
import { CubeIcon, PencilIcon, ShoppingBagIcon, LoadingIcon, BanknotesIcon, XCircleIcon, PrinterIcon, CheckCircleIcon } from './icons';
import { formatTimestamp } from '../utils/date';

// --- Sub-components ---

// 1. Menu Manager
const MenuManager: React.FC<{ companyId: string }> = ({ companyId }) => {
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
        const data = await getAllProducts(companyId);
        setProducts(data);
        setIsLoading(false);
    };

    useEffect(() => {
        loadProducts();
    }, [companyId]);

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
            companyId, // Fixed: include companyId
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

// --- New Component: Dual Print Modal (Kitchen + Receipt) ---
const DualPrintModal: React.FC<{ order: Order; onClose: () => void }> = ({ order, onClose }) => {
    
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <style>
                {`
                    @media print {
                        body * { visibility: hidden; }
                        #printable-area, #printable-area * { visibility: visible; }
                        #printable-area { 
                            position: absolute; 
                            left: 0; 
                            top: 0; 
                            width: 100%; 
                            color: black;
                            background: white;
                        }
                        .no-print { display: none; }
                    }
                `}
            </style>

            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
                {/* Header Actions */}
                <div className="p-4 border-b flex justify-between items-center no-print">
                    <h3 className="text-lg font-bold text-green-600 flex items-center gap-2">
                        <CheckCircleIcon className="h-6 w-6" />
                        Thanh toán thành công!
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <XCircleIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* Scrollable Preview Area */}
                <div className="overflow-y-auto p-6 bg-gray-100 flex justify-center">
                    <div id="printable-area" className="bg-white p-4 w-[80mm] shadow-sm text-black font-mono text-sm">
                        
                        {/* --- PHIẾU BẾP (KITCHEN TICKET) --- */}
                        <div className="mb-8">
                            <div className="text-center mb-4">
                                <h2 className="text-2xl font-extrabold uppercase border-2 border-black inline-block px-2 py-1">PHIẾU BẾP</h2>
                                <div className="mt-2 text-lg font-bold">#{order.id.slice(-4).toUpperCase()}</div>
                                <div className="text-xs">{formatTimestamp(order.timestamp)}</div>
                            </div>
                            
                            <div className="space-y-4">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="border-b border-dashed border-gray-300 pb-2">
                                        <div className="flex items-start">
                                            <span className="text-xl font-extrabold mr-2 w-8">{item.quantity}</span>
                                            <div className="flex-1">
                                                <span className="text-lg font-bold block leading-tight">{item.productName}</span>
                                                {item.note && <span className="text-sm italic mt-1 block">Note: {item.note}</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* --- DIVIDER (CUT LINE) --- */}
                        <div className="border-t-2 border-dashed border-black my-6 relative">
                            <span className="absolute left-0 -top-3">✂</span>
                            <span className="absolute right-0 -top-3">✂</span>
                        </div>

                        {/* --- HÓA ĐƠN (CUSTOMER RECEIPT) --- */}
                        <div>
                            <div className="text-center mb-4">
                                <h3 className="text-xl font-bold uppercase">HÓA ĐƠN</h3>
                                <p className="text-xs">Mã đơn: #{order.id.slice(-4).toUpperCase()}</p>
                                <p className="text-xs">Ngày: {formatTimestamp(order.timestamp)}</p>
                                <p className="text-xs">Thu ngân: {order.staffName || 'NV'}</p>
                            </div>

                            <div className="border-t border-b border-black py-2 mb-2">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between py-1">
                                        <div className="flex-1">
                                            <span className="font-bold">{item.productName}</span>
                                            <div className="text-xs text-gray-600">
                                                {item.quantity} x {new Intl.NumberFormat('vi-VN').format(item.price)}
                                            </div>
                                        </div>
                                        <span className="font-medium">
                                            {new Intl.NumberFormat('vi-VN').format(item.price * item.quantity)}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between items-center text-lg font-bold mt-2">
                                <span>TỔNG CỘNG</span>
                                <span>{new Intl.NumberFormat('vi-VN').format(order.totalAmount)}đ</span>
                            </div>
                            
                            <div className="mt-6 text-center text-xs italic">
                                <p>Cảm ơn quý khách & Hẹn gặp lại!</p>
                                <p>Wifi: FreeWifi - Pass: 12345678</p>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t bg-white no-print">
                    <div className="flex gap-3">
                        <button 
                            onClick={handlePrint}
                            className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg shadow hover:bg-blue-700 flex items-center justify-center gap-2"
                        >
                            <PrinterIcon className="h-5 w-5" />
                            In Phiếu (2 liên)
                        </button>
                        <button 
                            onClick={onClose}
                            className="flex-1 py-3 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300"
                        >
                            Đóng / Tiếp tục bán
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


// 2. POS Terminal
const POSTerminal: React.FC<{ companyId: string; currentUser?: { name: string; id?: string } }> = ({ companyId, currentUser }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<OrderItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('All');
    
    // State for Print Modal
    const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
    
    // Mobile: Cart Drawer State
    const [isCartOpen, setIsCartOpen] = useState(false);

    useEffect(() => {
        const load = async () => {
            const data = await getAllProducts(companyId);
            setProducts(data.filter(p => p.isAvailable));
        }
        load();
    }, [companyId]);

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
        if(cart.length <= 1) setIsCartOpen(false); // Close drawer if empty
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
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        if (!confirm(`Xác nhận thanh toán ${new Intl.NumberFormat('vi-VN').format(totalAmount)}đ?`)) return;

        try {
            const newOrder = await createOrder({
                companyId, // Fixed: include companyId
                timestamp: Date.now(),
                items: cart,
                totalAmount,
                status: OrderStatus.PENDING, // Vẫn tạo là Pending để Bếp theo dõi, nhưng đã in phiếu rồi
                paymentMethod: 'CASH',
                staffName: currentUser?.name || 'Admin',
                staffId: currentUser?.id
            });
            
            // Clear cart immediately for next customer
            setCart([]);
            setIsCartOpen(false);
            
            // Open Print Modal with the newly created order
            setCreatedOrder(newOrder);

        } catch (error) {
            alert("Lỗi tạo đơn hàng");
        }
    };

    // Cart Content Component (Reused for Desktop Sidebar and Mobile Drawer)
    const CartContent = () => (
        <div className="flex flex-col h-full">
             <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cart.length === 0 ? (
                    <div className="text-center text-gray-500 mt-10 flex flex-col items-center">
                        <ShoppingBagIcon className="h-12 w-12 text-gray-300 mb-2"/>
                        <p>Giỏ hàng trống</p>
                        <p className="text-sm">Chọn món bên trái để thêm</p>
                    </div>
                ) : (
                    cart.map(item => (
                        <div key={item.productId} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <div className="flex-1">
                                <p className="font-medium text-sm dark:text-white">{item.productName}</p>
                                <p className="text-xs text-gray-500">{new Intl.NumberFormat('vi-VN').format(item.price)}</p>
                            </div>
                            <div className="flex items-center gap-3 bg-white dark:bg-gray-600 rounded-lg px-2 py-1 shadow-sm">
                                <button onClick={() => updateQuantity(item.productId, -1)} className="w-6 h-6 flex items-center justify-center text-gray-600 dark:text-gray-200 font-bold text-lg hover:bg-gray-100 dark:hover:bg-gray-500 rounded">-</button>
                                <span className="w-4 text-center text-sm font-bold dark:text-white">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.productId, 1)} className="w-6 h-6 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-lg hover:bg-gray-100 dark:hover:bg-gray-500 rounded">+</button>
                            </div>
                            <button onClick={() => removeFromCart(item.productId)} className="ml-3 text-red-500 p-1 hover:bg-red-50 rounded"><XCircleIcon className="h-5 w-5"/></button>
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
                    className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-lg shadow-green-600/30"
                >
                    <BanknotesIcon className="h-5 w-5"/> Thanh toán ngay
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full relative">
            {/* Category Bar - Scrollable */}
            <div className="flex-shrink-0 px-2 py-2 bg-white dark:bg-gray-800 border-b dark:border-gray-700 overflow-x-auto whitespace-nowrap no-scrollbar md:px-4">
                <div className="flex gap-2">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                                selectedCategory === cat 
                                ? 'bg-primary-600 text-white shadow-md' 
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                {/* Left: Product Grid */}
                <div className="flex-1 p-2 md:p-4 overflow-y-auto pb-24 md:pb-4 bg-gray-100 dark:bg-gray-900">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                        {filteredProducts.map(p => (
                            <div 
                                key={p.id} 
                                onClick={() => addToCart(p)}
                                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm cursor-pointer active:scale-95 transition-transform duration-100 overflow-hidden border border-transparent hover:border-primary-500"
                            >
                                <div className="h-28 md:h-40 bg-gray-200 dark:bg-gray-700 relative">
                                    {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" loading="lazy" /> : (
                                        <div className="flex items-center justify-center h-full text-gray-400"><CubeIcon className="h-10 w-10"/></div>
                                    )}
                                    {/* Add Button Overlay */}
                                    <div className="absolute bottom-2 right-2 bg-white dark:bg-gray-800 rounded-full p-1.5 shadow">
                                        <span className="text-primary-600 font-bold text-lg leading-none">+</span>
                                    </div>
                                </div>
                                <div className="p-3">
                                    <p className="font-semibold text-gray-800 dark:text-white text-sm md:text-base line-clamp-2 h-10 md:h-12 leading-tight">{p.name}</p>
                                    <p className="text-primary-600 font-bold mt-1">{new Intl.NumberFormat('vi-VN').format(p.price)}đ</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Desktop Cart Sidebar (Hidden on mobile) */}
                <div className="hidden md:flex w-96 bg-white dark:bg-gray-800 shadow-xl flex-col border-l dark:border-gray-700 z-10">
                    <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                        <h2 className="font-bold text-lg flex items-center gap-2"><ShoppingBagIcon className="h-5 w-5"/> Giỏ hàng</h2>
                        <p className="text-xs text-gray-500">NV: {currentUser?.name}</p>
                    </div>
                    <CartContent />
                </div>
            </div>
            
            {/* Mobile: Floating Cart Bar */}
            <div className="md:hidden absolute bottom-4 left-3 right-3 z-20 transition-transform duration-300">
                 {cart.length > 0 && (
                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="w-full bg-gray-900 dark:bg-gray-700 text-white p-3 rounded-xl shadow-xl flex justify-between items-center border border-gray-700"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-primary-600 text-white rounded-full h-8 w-8 flex items-center justify-center font-bold text-sm shadow-sm border-2 border-gray-900">
                                {totalItems}
                            </div>
                            <div className="text-left">
                                <p className="text-xs text-gray-400 font-medium">Tổng cộng</p>
                                <p className="font-bold text-base">{new Intl.NumberFormat('vi-VN').format(totalAmount)}đ</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-bold bg-white text-gray-900 px-3 py-1.5 rounded-lg">
                            Xem giỏ
                        </div>
                    </button>
                 )}
            </div>

            {/* Mobile: Cart Drawer/Modal */}
            {isCartOpen && (
                <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
                    <div className="bg-white dark:bg-gray-800 rounded-t-2xl h-[85vh] flex flex-col shadow-2xl relative animate-in slide-in-from-bottom duration-300">
                        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700 rounded-t-2xl">
                             <div>
                                <h2 className="font-bold text-lg flex items-center gap-2"><ShoppingBagIcon className="h-5 w-5"/> Giỏ hàng</h2>
                                <p className="text-xs text-gray-500">NV: {currentUser?.name}</p>
                             </div>
                             <button onClick={() => setIsCartOpen(false)} className="p-2 bg-gray-200 dark:bg-gray-600 rounded-full hover:bg-gray-300"><XCircleIcon className="h-6 w-6 text-gray-600 dark:text-gray-200"/></button>
                        </div>
                        <CartContent />
                    </div>
                </div>
            )}
            
            {/* Dual Print Modal */}
            {createdOrder && (
                <DualPrintModal order={createdOrder} onClose={() => setCreatedOrder(null)} />
            )}
        </div>
    );
};

// 3. Order List (Kitchen View)
const OrderList: React.FC<{ companyId: string }> = ({ companyId }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        // REAL-TIME SUBSCRIPTION: Tự động cập nhật khi có đơn mới
        const unsubscribe = subscribeToActiveOrders(companyId, (data) => {
            setOrders(data);
            setIsLoading(false);
        });
        
        // Cleanup listener when component unmounts
        return () => unsubscribe();
    }, [companyId]);

    const handleStatusChange = async (id: string, newStatus: OrderStatus) => {
        await updateOrderStatus(id, newStatus);
        // Không cần loadOrders() vì subscription sẽ tự update
    };

    return (
        <div className="p-4 md:p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    Màn hình Bếp (Monitor)
                    <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <span className="text-xs font-normal text-gray-500">Live</span>
                </h2>
            </div>

            {isLoading ? <LoadingIcon className="h-8 w-8 mx-auto" /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {orders.length === 0 && (
                        <div className="col-span-3 text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-600">
                            <p className="text-gray-500 font-medium">Không có đơn hàng nào đang xử lý.</p>
                        </div>
                    )}
                    
                    {orders.map(order => (
                        <div key={order.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md border-l-4 border-yellow-500 p-4 relative animate-in fade-in duration-300">
                            <div className="flex justify-between mb-3 pb-2 border-b border-dashed border-gray-100 dark:border-gray-700">
                                <div className="flex flex-col">
                                    <span className="font-mono font-bold text-lg dark:text-white">#{order.id.slice(-4).toUpperCase()}</span>
                                    <span className="text-xs text-gray-500">{formatTimestamp(order.timestamp)}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-bold bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-600 dark:text-gray-300">
                                        NV: {order.staffName || 'N/A'}
                                    </span>
                                </div>
                            </div>
                            <div className="mb-4 space-y-2 max-h-40 overflow-y-auto">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center">
                                        <span className="font-bold text-gray-800 dark:text-gray-200 text-lg">{item.quantity}x</span>
                                        <span className="flex-1 ml-3 text-gray-700 dark:text-gray-300">{item.productName}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-4 pt-2 border-t dark:border-gray-700">
                                {order.status === OrderStatus.PENDING && (
                                    <button onClick={() => handleStatusChange(order.id, OrderStatus.PREPARING)} className="col-span-2 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700">
                                        Bắt đầu làm
                                    </button>
                                )}
                                {order.status === OrderStatus.PREPARING && (
                                    <button onClick={() => handleStatusChange(order.id, OrderStatus.COMPLETED)} className="col-span-2 py-2.5 bg-green-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-green-700">
                                        Đã xong
                                    </button>
                                )}
                                <button onClick={() => handleStatusChange(order.id, OrderStatus.CANCELLED)} className="col-span-2 mt-1 py-2 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200">
                                    Hủy đơn
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export { MenuManager, POSTerminal, OrderList };
