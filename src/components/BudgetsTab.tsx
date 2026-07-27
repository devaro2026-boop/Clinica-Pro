import { useState, useEffect } from 'react';
import { Budget, CatalogItem, BudgetItem } from '../types';
import { Plus, Check, X, FileText, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface BudgetsTabProps {
  patientId: string;
}

export default function BudgetsTab({ patientId }: BudgetsTabProps) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [notes, setNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState<{item: CatalogItem, quantity: number}[]>([]);

  useEffect(() => {
    fetchBudgets();
    fetchCatalog();
  }, [patientId]);

  const fetchBudgets = async () => {
    const res = await fetch(`/api/patients/${patientId}/budgets`);
    const data = await res.json();
    setBudgets(data);
  };

  const fetchCatalog = async () => {
    const res = await fetch('/api/catalog');
    const data = await res.json();
    setCatalog(data);
  };

  const handleAddItem = (item: CatalogItem) => {
    const exists = selectedItems.find(i => i.item.id === item.id);
    if (exists) {
      setSelectedItems(selectedItems.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setSelectedItems([...selectedItems, { item, quantity: 1 }]);
    }
  };

  const handleUpdateQuantity = (itemId: number, quantity: number) => {
    if (quantity <= 0) {
      setSelectedItems(selectedItems.filter(i => i.item.id !== itemId));
      return;
    }
    setSelectedItems(selectedItems.map(i => i.item.id === itemId ? { ...i, quantity } : i));
  };

  const handleSaveBudget = async () => {
    if (selectedItems.length === 0) return;
    setLoading(true);
    
    const totalAmount = selectedItems.reduce((acc, curr) => acc + (curr.item.unit_price * curr.quantity), 0);
    const items = selectedItems.map(i => ({
      item_id: i.item.id,
      quantity: i.quantity,
      unit_price: i.item.unit_price,
      total_price: i.item.unit_price * i.quantity
    }));

    await fetch(`/api/patients/${patientId}/budgets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ total_amount: totalAmount, notes, items })
    });
    
    setShowForm(false);
    setSelectedItems([]);
    setNotes('');
    setLoading(false);
    fetchBudgets();
  };

  const handleUpdateStatus = async (budgetId: number, status: string) => {
    await fetch(`/api/budgets/${budgetId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetchBudgets();
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-900">Orçamentos</h3>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors font-medium text-sm"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{showForm ? 'Cancelar' : 'Novo Orçamento'}</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-gray-800 mb-4">Selecione Serviços e Produtos</h4>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {catalog.map(item => (
                  <div key={item.id} className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(item.unit_price)} / {item.unit_type}</p>
                    </div>
                    <button onClick={() => handleAddItem(item)} className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-4">Resumo do Orçamento</h4>
              {selectedItems.length === 0 ? (
                <p className="text-sm text-gray-500 italic text-center p-8 bg-white rounded-xl border border-dashed border-gray-300">Adicione itens ao orçamento.</p>
              ) : (
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4">
                  {selectedItems.map((sel, idx) => (
                    <div key={idx} className="flex items-center justify-between pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">{sel.item.name}</p>
                        <p className="text-xs text-gray-500">{formatCurrency(sel.item.unit_price)} / {sel.item.unit_type}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2 border border-gray-200 rounded-lg p-1">
                           <input 
                             type="number" 
                             min="1" 
                             step="1"
                             className="w-12 text-center text-sm outline-none bg-transparent"
                             value={sel.quantity}
                             onChange={e => handleUpdateQuantity(sel.item.id, parseFloat(e.target.value) || 0)}
                           />
                           <span className="text-xs text-gray-400 pr-1">{sel.item.unit_type}</span>
                        </div>
                        <p className="font-semibold text-gray-900 text-sm w-24 text-right">
                          {formatCurrency(sel.item.unit_price * sel.quantity)}
                        </p>
                        <button onClick={() => handleUpdateQuantity(sel.item.id, 0)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="pt-4 border-t border-gray-100">
                     <label className="block text-xs font-medium text-gray-500 mb-1">Observações / Condições</label>
                     <textarea 
                       className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 resize-none"
                       rows={2}
                       value={notes}
                       onChange={e => setNotes(e.target.value)}
                     ></textarea>
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    <p className="text-gray-600 font-medium">Total</p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(selectedItems.reduce((acc, curr) => acc + (curr.item.unit_price * curr.quantity), 0))}
                    </p>
                  </div>
                  
                  <button 
                    disabled={loading}
                    onClick={handleSaveBudget}
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white py-2.5 rounded-xl font-medium transition-colors text-sm"
                  >
                    Salvar Orçamento
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {budgets.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Nenhum orçamento gerado.</p>
        ) : (
          budgets.map(b => (
            <div key={b.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Data: {format(parseISO(b.created_at), 'dd/MM/yyyy HH:mm')}</p>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-900">Total: {formatCurrency(b.total_amount)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      b.status === 'approved' ? 'bg-green-100 text-green-800' :
                      b.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {b.status === 'approved' ? 'Aprovado' : b.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                    </span>
                  </div>
                </div>
                {b.status === 'draft' && (
                  <div className="flex items-center space-x-2">
                    <button onClick={() => handleUpdateStatus(b.id, 'approved')} className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-medium flex items-center space-x-1">
                      <Check className="w-4 h-4" /> <span>Aprovar</span>
                    </button>
                    <button onClick={() => handleUpdateStatus(b.id, 'rejected')} className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm font-medium flex items-center space-x-1">
                      <X className="w-4 h-4" /> <span>Rejeitar</span>
                    </button>
                  </div>
                )}
              </div>
              <div className="p-4">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-gray-500 font-medium">
                      <th className="pb-2">Item</th>
                      <th className="pb-2">Quantidade</th>
                      <th className="pb-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {b.items?.map(item => (
                      <tr key={item.id}>
                        <td className="py-2">{item.name}</td>
                        <td className="py-2 text-gray-500">{item.quantity} {item.unit_type}</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(item.total_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {b.notes && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 font-medium mb-1">Observações:</p>
                    <p className="text-sm text-gray-700">{b.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
