import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, Clock, CheckCircle2, PhoneCall, Calendar, Search, Filter, 
  Plus, FileText, AlertCircle, RefreshCw, ChevronRight, ShieldAlert, 
  ArrowUpRight, Database, Download, CheckSquare, X, Mail, Phone, MessageSquare
} from 'lucide-react';

// Types
interface ContactLog {
  id: string;
  contactedAt: string;
  channel: 'phone' | 'email' | 'zalo' | 'other';
  result: 'contacted' | 'no_answer' | 'no_response' | 'callback_scheduled' | 'waiting_documents';
  note: string;
  nextContactAt?: string;
}

interface DocumentItem {
  id: string;
  type: string;
  status: 'missing' | 'received' | 'needs_revision' | 'not_applicable';
  isRequired: boolean;
}

interface Order {
  id: string;
  orderCode: string;
  domainName: string;
  orderType: string;
  receivedAt: string;
  deadlineAt: string;
  processingStatus: 'new' | 'processing' | 'waiting_customer' | 'completed';
  completedAt?: string;
  documents: DocumentItem[];
  contactLogs: ContactLog[];
  nextContactDate?: string;
}

// Helper calculation
const getDaysRemaining = (deadlineStr: string) => {
  const now = new Date();
  const deadline = new Date(deadlineStr);
  const diffTime = deadline.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const mockInitialOrders: Order[] = Array.from({ length: 120 }, (_, index) => {
  const id = `ord-${index + 1}`;
  const code = `OCN-${20260000 + index + 1}`;
  const domains = ['ocean-tech.vn', 'duytan-store.com', 'techasia.io', 'logistics-global.vn', 'vietnam-import.com.vn', 'vinatoy.vn', 'globalbrand.org'];
  const domain = `${domains[index % domains.length].replace('.', `${index + 1}.`)}`;
  
  const now = new Date();
  let offsetDays = (index % 15) - 8;
  const received = new Date(now.getTime() + offsetDays * 86400000);
  const deadline = new Date(received.getTime() + 10 * 86400000);

  let status: Order['processingStatus'] = 'processing';
  if (index % 5 === 0) status = 'completed';
  else if (index % 3 === 0) status = 'waiting_customer';
  else if (index % 7 === 0) status = 'new';

  return {
    id,
    orderCode: code,
    domainName: domain,
    orderType: index % 2 === 0 ? 'Tên miền .VN' : 'Tên miền Quốc tế',
    receivedAt: received.toISOString(),
    deadlineAt: deadline.toISOString(),
    processingStatus: status,
    completedAt: status === 'completed' ? new Date().toISOString() : undefined,
    documents: [
      { id: 'doc-1', type: 'Bản khai thông tin', status: index % 4 === 0 ? 'received' : 'missing', isRequired: true },
      { id: 'doc-2', type: 'CCCD/ĐKKD', status: index % 3 === 0 ? 'received' : 'missing', isRequired: true },
      { id: 'doc-3', type: 'Bản cam kết', status: 'not_applicable', isRequired: false },
    ],
    contactLogs: [
      {
        id: `log-${index}-1`,
        contactedAt: new Date(received.getTime() + 86400000).toISOString(),
        channel: 'phone',
        result: 'no_answer',
        note: 'Khách hàng không nghe máy, gửi thêm email nhắc.',
        nextContactAt: new Date(now.getTime() + (index % 2) * 86400000).toISOString().split('T')[0]
      }
    ],
    nextContactDate: new Date(now.getTime() + (index % 3 - 1) * 86400000).toISOString().split('T')[0]
  };
});

export default function App() {
  const [orders, setOrders] = useState<Order[]>(mockInitialOrders);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'due_soon' | 'critical' | 'overdue' | 'completed'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Contact Log state
  const [newLogChannel, setNewLogChannel] = useState<ContactLog['channel']>('phone');
  const [newLogResult, setNewLogResult] = useState<ContactLog['result']>('contacted');
  const [newLogNote, setNewLogNote] = useState('');
  const [newLogNextDate, setNewLogNextDate] = useState('');

  // Stats
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    let totalUnfinished = 0;
    let todayContact = 0;
    let dueSoon = 0;
    let critical = 0;
    let overdue = 0;
    let completed = 0;

    orders.forEach(order => {
      if (order.processingStatus === 'completed') {
        completed++;
        return;
      }
      totalUnfinished++;

      const daysLeft = getDaysRemaining(order.deadlineAt);
      if (daysLeft < 0) overdue++;
      else if (daysLeft === 0 || daysLeft === 1) critical++;
      else if (daysLeft <= 3) dueSoon++;

      if (order.nextContactDate === todayStr) {
        todayContact++;
      }
    });

    return { totalUnfinished, todayContact, dueSoon, critical, overdue, completed };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return orders.filter(order => {
      const matchesSearch = order.orderCode.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            order.domainName.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      const daysLeft = getDaysRemaining(order.deadlineAt);
      const isCompleted = order.processingStatus === 'completed';

      if (activeTab === 'completed') return isCompleted;
      if (isCompleted) return false;

      if (activeTab === 'today') return order.nextContactDate === todayStr;
      if (activeTab === 'due_soon') return daysLeft <= 3 && daysLeft > 1;
      if (activeTab === 'critical') return daysLeft === 1 || daysLeft === 0;
      if (activeTab === 'overdue') return daysLeft < 0;

      return true;
    });
  }, [orders, searchTerm, activeTab]);

  const handleAddContactLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    const newLog: ContactLog = {
      id: `log-${Date.now()}`,
      contactedAt: new Date().toISOString(),
      channel: newLogChannel,
      result: newLogResult,
      note: newLogNote,
      nextContactAt: newLogNextDate || undefined,
    };

    const updatedOrders = orders.map(o => {
      if (o.id === selectedOrder.id) {
        return {
          ...o,
          contactLogs: [newLog, ...o.contactLogs],
          nextContactDate: newLogNextDate || o.nextContactDate,
          processingStatus: newLogResult === 'waiting_documents' ? 'waiting_customer' as const : 'processing' as const
        };
      }
      return o;
    });

    setOrders(updatedOrders);
    setSelectedOrder(updatedOrders.find(o => o.id === selectedOrder.id) || null);
    setNewLogNote('');
    setNewLogNextDate('');
  };

  const handleToggleDocStatus = (docId: string) => {
    if (!selectedOrder) return;
    const updatedDocs = selectedOrder.documents.map(d => {
      if (d.id === docId) {
        const nextStatus = d.status === 'received' ? 'missing' : 'received';
        return { ...d, status: nextStatus as any };
      }
      return d;
    });

    const allRequiredDone = updatedDocs.filter(d => d.isRequired).every(d => d.status === 'received');
    
    const updatedOrders = orders.map(o => {
      if (o.id === selectedOrder.id) {
        return {
          ...o,
          documents: updatedDocs,
          processingStatus: allRequiredDone ? 'completed' as const : o.processingStatus,
          completedAt: allRequiredDone ? new Date().toISOString() : undefined
        };
      }
      return o;
    });

    setOrders(updatedOrders);
    setSelectedOrder(updatedOrders.find(o => o.id === selectedOrder.id) || null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-tr from-blue-600 to-cyan-500 p-2 rounded-xl text-white shadow-lg shadow-blue-500/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Ocean Deadline Tracker</h1>
              <p className="text-xs text-slate-400">Hệ thống giám sát hạn xử lý hồ sơ & Cảnh báo khóa tên miền</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo đơn demo</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <button 
            onClick={() => setActiveTab('all')}
            className={`p-4 rounded-xl border text-left transition-all ${activeTab === 'all' ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-500/20' : 'bg-white border-slate-200 hover:border-slate-300'}`}
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Chưa xong</span>
              <FileText className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-slate-800">{stats.totalUnfinished}</div>
            <div className="text-xs text-slate-500 mt-1">Đơn cần theo dõi</div>
          </button>

          <button 
            onClick={() => setActiveTab('today')}
            className={`p-4 rounded-xl border text-left transition-all ${activeTab === 'today' ? 'bg-white border-indigo-500 shadow-md ring-2 ring-indigo-500/20' : 'bg-white border-slate-200 hover:border-slate-300'}`}
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Hẹn hôm nay</span>
              <PhoneCall className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold text-indigo-600">{stats.todayContact}</div>
            <div className="text-xs text-slate-500 mt-1">Cần gọi/nhắc ngay</div>
          </button>

          <button 
            onClick={() => setActiveTab('due_soon')}
            className={`p-4 rounded-xl border text-left transition-all ${activeTab === 'due_soon' ? 'bg-white border-amber-500 shadow-md ring-2 ring-amber-500/20' : 'bg-white border-slate-200 hover:border-slate-300'}`}
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Còn 2-3 ngày</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-600">{stats.dueSoon}</div>
            <div className="text-xs text-slate-500 mt-1">Sắp đến hạn</div>
          </button>

          <button 
            onClick={() => setActiveTab('critical')}
            className={`p-4 rounded-xl border text-left transition-all ${activeTab === 'critical' ? 'bg-white border-orange-500 shadow-md ring-2 ring-orange-500/20' : 'bg-white border-slate-200 hover:border-slate-300'}`}
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Nguy cơ khóa</span>
              <AlertTriangle className="w-4 h-4 text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-orange-600">{stats.critical}</div>
            <div className="text-xs text-slate-500 mt-1">Còn ≤ 1 ngày</div>
          </button>

          <button 
            onClick={() => setActiveTab('overdue')}
            className={`p-4 rounded-xl border text-left transition-all ${activeTab === 'overdue' ? 'bg-white border-red-500 shadow-md ring-2 ring-red-500/20' : 'bg-white border-slate-200 hover:border-slate-300'}`}
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Đã quá hạn</span>
              <AlertCircle className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <div className="text-xs text-slate-500 mt-1">Cần xử lý khẩn cấp</div>
          </button>

          <button 
            onClick={() => setActiveTab('completed')}
            className={`p-4 rounded-xl border text-left transition-all ${activeTab === 'completed' ? 'bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/20' : 'bg-white border-slate-200 hover:border-slate-300'}`}
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Đã hoàn tất</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-600">{stats.completed}</div>
            <div className="text-xs text-slate-500 mt-1">Hồ sơ xong</div>
          </button>
        </div>

        {/* Task List / Queue Section */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          {/* Filters Bar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Tìm mã đơn, tên miền..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center space-x-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
              <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Lọc nhanh:</span>
              <button 
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${activeTab === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-200/70 text-slate-700 hover:bg-slate-200'}`}
              >
                Tất cả chưa hoàn tất
              </button>
              <button 
                onClick={() => setActiveTab('today')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${activeTab === 'today' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
              >
                Hẹn gọi hôm nay
              </button>
              <button 
                onClick={() => setActiveTab('critical')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${activeTab === 'critical' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'}`}
              >
                Cảnh báo nguy cơ
              </button>
            </div>
          </div>

          {/* Table / List */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3.5 px-4">Mã đơn & Tên miền</th>
                  <th className="py-3.5 px-4">Ngày tiếp nhận</th>
                  <th className="py-3.5 px-4">Mốc hạn (10 ngày)</th>
                  <th className="py-3.5 px-4">Thời gian còn lại</th>
                  <th className="py-3.5 px-4">Hồ sơ bắt buộc</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      Không tìm thấy đơn hàng nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.slice(0, 30).map((order) => {
                    const daysLeft = getDaysRemaining(order.deadlineAt);
                    const isCompleted = order.processingStatus === 'completed';

                    let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                    let badgeText = `${daysLeft} ngày`;

                    if (isCompleted) {
                      badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      badgeText = 'Đã xong';
                    } else if (daysLeft < 0) {
                      badgeColor = 'bg-red-50 text-red-700 border-red-200 font-bold';
                      badgeText = `Quá hạn ${Math.abs(daysLeft)} ngày`;
                    } else if (daysLeft === 0 || daysLeft === 1) {
                      badgeColor = 'bg-orange-50 text-orange-700 border-orange-200 font-bold';
                      badgeText = daysLeft === 0 ? 'Hết hạn hôm nay' : 'Còn 1 ngày (Nguy cơ)';
                    } else if (daysLeft <= 3) {
                      badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                      badgeText = `Còn ${daysLeft} ngày`;
                    }

                    const reqDocs = order.documents.filter(d => d.isRequired);
                    const doneDocs = reqDocs.filter(d => d.status === 'received');

                    return (
                      <tr 
                        key={order.id}
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center space-x-2">
                            <span>{order.domainName}</span>
                          </div>
                          <div className="text-xs text-slate-500 flex items-center space-x-2 mt-0.5">
                            <span>{order.orderCode}</span>
                            <span>•</span>
                            <span>{order.orderType}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 text-xs">
                          {new Date(order.receivedAt).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 text-xs">
                          {new Date(order.deadlineAt).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${badgeColor}`}>
                            {badgeText}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div 
                                className="bg-blue-600 h-full rounded-full transition-all"
                                style={{ width: `${(doneDocs.length / reqDocs.length) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-slate-600">
                              {doneDocs.length}/{reqDocs.length}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrder(order);
                            }}
                            className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
                          >
                            Chi tiết & Nhắc
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal Details & Contact Log */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center space-x-3">
                  <h2 className="text-lg font-bold text-slate-900">{selectedOrder.domainName}</h2>
                  <span className="text-xs font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                    {selectedOrder.orderCode}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Tiếp nhận: {new Date(selectedOrder.receivedAt).toLocaleDateString('vi-VN')} | 
                  Hạn xử lý 10 ngày: <strong className="text-red-600">{new Date(selectedOrder.deadlineAt).toLocaleDateString('vi-VN')}</strong>
                </p>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Checklist Hồ sơ */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center space-x-2">
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                  <span>Trạng thái Hồ sơ Giấy tờ</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedOrder.documents.map(doc => (
                    <div 
                      key={doc.id}
                      onClick={() => handleToggleDocStatus(doc.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        doc.status === 'received' 
                          ? 'bg-emerald-50/50 border-emerald-300 text-emerald-900' 
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input 
                          type="checkbox" 
                          checked={doc.status === 'received'}
                          onChange={() => {}}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                        <span className="text-sm font-medium">{doc.type}</span>
                      </div>
                      <span className="text-xs font-semibold">
                        {doc.status === 'received' ? 'Đã nhận' : 'Còn thiếu'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Ghi nhận liên hệ mới */}
              <form onSubmit={handleAddContactLog} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                  <PhoneCall className="w-4 h-4 text-indigo-600" />
                  <span>Ghi nhận lịch sử liên hệ mới</span>
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Kênh liên hệ</label>
                    <select 
                      value={newLogChannel} 
                      onChange={e => setNewLogChannel(e.target.value as any)}
                      className="w-full text-sm border border-slate-300 rounded-lg p-2 bg-white"
                    >
                      <option value="phone">Điện thoại</option>
                      <option value="zalo">Zalo</option>
                      <option value="email">Email</option>
                      <option value="other">Kênh khác</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Kết quả liên hệ</label>
                    <select 
                      value={newLogResult} 
                      onChange={e => setNewLogResult(e.target.value as any)}
                      className="w-full text-sm border border-slate-300 rounded-lg p-2 bg-white"
                    >
                      <option value="contacted">Thành công (Đã trao đổi)</option>
                      <option value="no_answer">Khách không nghe máy</option>
                      <option value="waiting_documents">Khách hẹn bổ sung giấy tờ</option>
                      <option value="callback_scheduled">Hẹn gọi lại sau</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Ghi chú xử lý</label>
                  <input 
                    type="text" 
                    placeholder="VD: Khách hẹn gửi CCCD trước 5h chiều..."
                    value={newLogNote}
                    onChange={e => setNewLogNote(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2 bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Ngày hẹn liên hệ lại (Nếu có)</label>
                  <input 
                    type="date" 
                    value={newLogNextDate}
                    onChange={e => setNewLogNextDate(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2 bg-white"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg text-sm transition shadow-sm"
                >
                  Lưu lịch sử & Cập nhật
                </button>
              </form>

              {/* Lịch sử liên hệ cũ */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3">Lịch sử tương tác trước đây</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedOrder.contactLogs.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Chưa có lịch sử liên hệ.</p>
                  ) : (
                    selectedOrder.contactLogs.map(log => (
                      <div key={log.id} className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-500">
                          <span className="font-semibold text-slate-700 capitalize">Kênh: {log.channel}</span>
                          <span>{new Date(log.contactedAt).toLocaleString('vi-VN')}</span>
                        </div>
                        <p className="text-slate-800 font-medium">{log.note}</p>
                        {log.nextContactAt && (
                          <div className="text-indigo-600 font-medium">
                            Hẹn gọi lại ngày: {log.nextContactAt}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        Ocean Deadline Tracker MVP © 2026 - CSKH Ocean Department
      </footer>
    </div>
  );
}
