import { useState, useEffect } from 'react';
import { CatalogItem } from '../types';
import { Plus, Trash2, Edit3, Package as PackageIcon, Syringe } from 'lucide-react';
import NotificationBell from '../components/NotificationBell';

export default function Catalog() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<CatalogItem>>({
    type: 'service',
    name: '',
    description: '',
    unit_price: 0,
    unit_type: 'sessão'
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const res = await fetch('/api/catalog');
    const data = await res.json();
    setItems(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await fetch(`/api/catalog/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
    } else {
      await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
    }
    
    setFormData({ type: 'service', name: '', description: '', unit_price: 0, unit_type: 'sessão' });
    setEditingId(null);
    setShowForm(false);
    fetchItems();
  };

  const handleEdit = (item: CatalogItem) => {
    setFormData(item);
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir este item?')) {
      await fetch(`/api/catalog/${id}`, { method: 'DELETE' });
      fetchItems();
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div className="flex justify-between items-center w-full sm:w-auto">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Catálogo</h2>
            <p className="text-sm md:text-base text-gray-500 mt-1 md:mt-2">Serviços e Produtos</p>
          </div>
          <div className="sm:hidden">
            <NotificationBell />
          </div>
        </div>
        <div className="flex items-center space-x-3 md:space-x-4 w-full sm:w-auto">
          <div className="hidden sm:block">
            <NotificationBell />
          </div>
          <button 
            onClick={() => {
              setShowForm(!showForm);
              if (showForm) {
                setEditingId(null);
                setFormData({ type: 'service', name: '', description: '', unit_price: 0, unit_type: 'sessão' });
              }
            }}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-5 py-2 md:py-2.5 rounded-xl transition-colors font-medium text-sm md:text-base"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            <span>Novo Item</span>
          </button>
        </div>
      </header>

      {showForm && (
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 md:mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{editingId ? 'Editar Item' : 'Cadastrar Item'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select className="w-full p-2.5 border border-gray-300 rounded-xl bg-white outline-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as 'service'|'product'})}>
                <option value="service">Serviço</option>
                <option value="product">Produto (ex: Botox, Ácido)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input type="text" required className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <input type="text" className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço Unitário (R$)</label>
              <input type="number" step="0.01" required className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={formData.unit_price} onChange={e => setFormData({...formData, unit_price: parseFloat(e.target.value)})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unidade de Medida</label>
              <select className="w-full p-2.5 border border-gray-300 rounded-xl bg-white outline-none" value={formData.unit_type} onChange={e => setFormData({...formData, unit_type: e.target.value})}>
                <option value="sessão">Sessão</option>
                <option value="unidade">Unidade</option>
                <option value="ml">ml (Mililitro)</option>
                <option value="pacote">Pacote</option>
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end mt-2">
              <button type="submit" className="w-full md:w-auto bg-gray-900 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-gray-800 transition-colors">
                Salvar Item
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <ul className="divide-y divide-gray-50">
          {items.map(item => (
            <li key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-gray-50/50 transition-colors gap-4">
              <div className="flex items-center space-x-3 md:space-x-4">
                <div className="shrink-0 w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                  {item.type === 'service' ? <Syringe className="w-5 h-5 md:w-6 md:h-6" /> : <PackageIcon className="w-5 h-5 md:w-6 md:h-6" />}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm md:text-base font-semibold text-gray-900 truncate">{item.name}</h4>
                  <p className="text-xs md:text-sm text-gray-500 truncate">{item.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/3">
                <div className="text-right">
                  <p className="text-sm md:text-base font-semibold text-gray-900">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unit_price)}
                  </p>
                  <p className="text-xs text-gray-500">por {item.unit_type}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => handleEdit(item)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Edit3 className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
          {items.length === 0 && (
            <li className="p-8 text-center text-gray-500">Nenhum item cadastrado.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
