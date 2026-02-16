import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    HiOutlinePlus, HiOutlineSearch, HiOutlineTrash, HiOutlinePencilAlt, 
    HiOutlineChevronUp, HiOutlineChevronDown, HiOutlineFilter,
    HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineSave, 
    HiOutlineXCircle, HiOutlineInformationCircle 
} from 'react-icons/hi';
import UserContext from '../UserContext/UserContext';

const GlobalPermissionTypesPage = () => {
    const { hasPermission, loading: contextLoading } = useContext(UserContext);

    // Data States
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // CRUD UI States
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newPermission, setNewPermission] = useState({ name: '', description: '', category: '' });
    const [editingId, setEditingId] = useState(null);
    const [editedData, setEditedData] = useState({ name: '', description: '', category: '' });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [permissionToDelete, setPermissionToDelete] = useState(null);

    // Filter, Sort & Pagination States
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    const fetchPermissions = async () => {
        if (contextLoading) return;
        setLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/permissions`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
            const data = await response.json();
            if (data.success) setPermissions(data.permissions);
        } catch (err) {
            setError('Failed to sync directory.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (!contextLoading) fetchPermissions(); }, [contextLoading]);

    // Reset pagination on filter change
    useEffect(() => { setCurrentPage(1); }, [searchTerm, activeCategory]);

    // --- CRUD Logic ---
    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/permissions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(newPermission),
            });
            if (res.ok) {
                setSuccessMessage("New Permission Deployed");
                setNewPermission({ name: '', description: '', category: '' });
                setShowCreateForm(false);
                fetchPermissions();
            }
        } catch (err) { setError("Create failed"); }
    };

    const handleUpdate = async (id) => {
        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/permissions/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(editedData),
            });
            if (res.ok) {
                setEditingId(null);
                setSuccessMessage("Logic Updated");
                fetchPermissions();
            }
        } catch (err) { setError("Update failed"); }
    };

    const handleDelete = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/permissions/${permissionToDelete._id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (res.ok) {
                setSuccessMessage("Access Revoked");
                setShowDeleteConfirm(false);
                fetchPermissions();
            }
        } catch (err) { setError("Delete failed"); }
    };

    // --- Helpers ---
    const categories = ['All', ...new Set(permissions.map(p => p.category || 'General'))];

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <HiOutlineChevronUp className="ml-1 opacity-20" />;
        return sortConfig.direction === 'ascending' ? <HiOutlineChevronUp className="ml-1 text-cyan-400" /> : <HiOutlineChevronDown className="ml-1 text-cyan-400" />;
    };

    // --- Filter & Sort Engine ---
    const filteredData = permissions.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCat = activeCategory === 'All' || (p.category || 'General') === activeCategory;
        return matchesSearch && matchesCat;
    }).sort((a, b) => {
        const aVal = a[sortConfig.key] || '';
        const bVal = b[sortConfig.key] || '';
        if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
        return sortConfig.direction === 'ascending' ? 1 : -1;
    });

    const currentItems = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-6 md:p-10">
            {/* Header */}
            <div className="mb-10 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Permission Tree<span className="text-cyan-400">°</span></h1>
                    <p className="text-slate-400 mt-2">Global access logic and technical gates.</p>
                </div>
                {hasPermission('permission:create') && (
                    <button onClick={() => setShowCreateForm(!showCreateForm)} className="bg-white text-slate-950 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-cyan-400 transition-all">
                        <HiOutlinePlus size={20} /> Create New
                    </button>
                )}
            </div>

            {/* Create Form */}
            <AnimatePresence>
                {showCreateForm && (
                    <motion.form 
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        onSubmit={handleCreate} className="mb-8 p-8 rounded-[2.5rem] bg-slate-900/40 border border-slate-800 backdrop-blur-xl grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden"
                    >
                        <div className="form-input-container group"><label className="form-label">Key Name</label><input type="text" value={newPermission.name} onChange={e => setNewPermission({...newPermission, name: e.target.value})} className="form-input" placeholder="logic:key" required /></div>
                        <div className="form-input-container group"><label className="form-label">Category</label><input type="text" value={newPermission.category} onChange={e => setNewPermission({...newPermission, category: e.target.value})} className="form-input" placeholder="Group" /></div>
                        <div className="form-input-container group"><label className="form-label">Description</label><input type="text" value={newPermission.description} onChange={e => setNewPermission({...newPermission, description: e.target.value})} className="form-input" placeholder="Role capability" /></div>
                        <div className="md:col-span-3 flex justify-end gap-3"><button type="submit" className="bg-cyan-500 text-slate-950 px-8 py-2 rounded-xl font-bold">Deploy</button></div>
                    </motion.form>
                )}
            </AnimatePresence>

            {/* Filter & Search Section */}
            <div className="space-y-6 mb-8">
                <div className="relative max-w-md group">
                    <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400" />
                    <input type="text" placeholder="Search logic keys..." className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 pl-12 text-white outline-none focus:ring-4 focus:ring-cyan-500/10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>

                <div className="flex items-center gap-3 overflow-x-auto pb-2 custom-scrollbar">
                    <div className="p-2 bg-slate-900 rounded-lg text-slate-500 border border-slate-800"><HiOutlineFilter /></div>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                                activeCategory === cat 
                                ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20' 
                                : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-600'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-800/50 border-b border-slate-700 text-[11px] font-black uppercase text-slate-400">
                                <th onClick={() => requestSort('name')} className="p-5 cursor-pointer hover:text-white group">Logic Key {getSortIcon('name')}</th>
                                <th onClick={() => requestSort('category')} className="p-5 cursor-pointer hover:text-white group">Category {getSortIcon('category')}</th>
                                <th className="p-5">Description</th>
                                <th className="p-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {currentItems.map((p) => (
                                <tr key={p._id} className="hover:bg-slate-800/30 transition-colors">
                                    {editingId === p._id ? (
                                        <>
                                            <td className="p-4"><input type="text" value={editedData.name} onChange={e => setEditedData({...editedData, name: e.target.value})} className="bg-slate-800 border border-cyan-500/50 rounded-lg p-2 text-xs w-full text-cyan-400 outline-none" /></td>
                                            <td className="p-4"><input type="text" value={editedData.category} onChange={e => setEditedData({...editedData, category: e.target.value})} className="bg-slate-800 border border-cyan-500/50 rounded-lg p-2 text-xs w-full text-white outline-none" /></td>
                                            <td className="p-4"><input type="text" value={editedData.description} onChange={e => setEditedData({...editedData, description: e.target.value})} className="bg-slate-800 border border-cyan-500/50 rounded-lg p-2 text-xs w-full text-white outline-none" /></td>
                                            <td className="p-4 text-right flex justify-end gap-2">
                                                <button onClick={() => handleUpdate(p._id)} className="p-2 text-emerald-400 hover:bg-emerald-400/10 rounded-lg"><HiOutlineSave size={20}/></button>
                                                <button onClick={() => setEditingId(null)} className="p-2 text-slate-500 hover:bg-slate-800 rounded-lg"><HiOutlineXCircle size={20}/></button>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="p-5 font-mono text-xs text-cyan-400 font-bold">{p.name}</td>
                                            <td className="p-5"><span className="text-[10px] font-black uppercase text-slate-500 bg-slate-950 px-2 py-1 rounded border border-slate-800">{p.category || 'General'}</span></td>
                                            <td className="p-5 text-slate-400 text-sm truncate max-w-xs">{p.description}</td>
                                            <td className="p-5 text-right flex justify-end gap-2">
                                                <button onClick={() => { setEditingId(p._id); setEditedData(p); }} className="p-2 border border-slate-800 rounded-xl text-slate-500 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all"><HiOutlinePencilAlt size={16}/></button>
                                                <button onClick={() => { setPermissionToDelete(p); setShowDeleteConfirm(true); }} className="p-2 border border-slate-800 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all"><HiOutlineTrash size={16}/></button>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-6 border-t border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Page {currentPage} of {totalPages}</span>
                    <div className="flex gap-2">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-2 rounded-xl border border-slate-800 text-slate-400 disabled:opacity-20 hover:bg-slate-800"><HiOutlineChevronLeft/></button>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-2 rounded-xl border border-slate-800 text-slate-400 disabled:opacity-20 hover:bg-slate-800"><HiOutlineChevronRight/></button>
                    </div>
                </div>
            </div>

            {/* Success Toast Placeholder */}
            <AnimatePresence>
                {successMessage && (
                    <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[110] bg-emerald-500 text-slate-950 px-6 py-3 rounded-2xl font-bold shadow-2xl flex items-center gap-2">
                        <HiOutlineInformationCircle size={20}/> {successMessage}
                        <button onClick={() => setSuccessMessage(null)} className="ml-4 opacity-50 hover:opacity-100">✕</button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete Modal */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center">
                            <HiOutlineTrash size={48} className="text-red-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">Confirm Revoke</h3>
                            <p className="text-slate-400 text-sm mb-6">Permanently delete logic key <span className="text-white font-bold">{permissionToDelete?.name}</span>?</p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 text-slate-400 font-bold hover:text-white transition-colors">Cancel</button>
                                <button onClick={handleDelete} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 hover:bg-red-500">Delete</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GlobalPermissionTypesPage;