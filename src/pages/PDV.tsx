import { useState, useEffect } from 'react';
import { CatalogItem, Patient } from '../types';
import { ShoppingCart, User, Plus, Minus, Trash2, Search, Percent, CheckCircle2, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import NotificationBell from '../components/NotificationBell';

interface CartItem {
  item: CatalogItem;
  quantity: number;
  customPrice: number;
}

export default function PDV() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastSaleAmount, setLastSaleAmount] = useState(0);
  const [lastSaleDesc, setLastSaleDesc] = useState('');

  const fetchData = async () => {
    try {
      const [cRes, pRes] = await Promise.all([
        fetch('/api/catalog'),
        fetch('/api/patients')
      ]);
      setCatalog(await cRes.json());
      setPatients(await pRes.json());
    } catch (e) {
      console.error('Error fetching catalog/patients for POS:', e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addToCart = (item: CatalogItem) => {
    const existing = cart.find(ci => ci.item.id === item.id);
    if (existing) {
      setCart(
        cart.map(ci =>
          ci.item.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
        )
      );
    } else {
      setCart([...cart, { item, quantity: 1, customPrice: item.unit_price }]);
    }
  };

  const updateQuantity = (itemId: number, delta: number) => {
    setCart(
      cart
        .map(ci => {
          if (ci.item.id === itemId) {
            const newQty = ci.quantity + delta;
            return { ...ci, quantity: newQty };
          }
          return ci;
        })
        .filter(ci => ci.quantity > 0)
    );
  };

  const updatePrice = (itemId: number, price: number) => {
    setCart(
      cart.map(ci =>
        ci.item.id === itemId ? { ...ci, customPrice: price } : ci
      )
    );
  };

  const removeFromCart = (itemId: number) => {
    setCart(cart.filter(ci => ci.item.id !== itemId));
  };

  const subtotal = cart.reduce((sum, ci) => sum + ci.customPrice * ci.quantity, 0);

  const discountAmount =
    discountType === 'percent'
      ? (subtotal * discountValue) / 100
      : discountValue;

  const total = Math.max(0, subtotal - discountAmount);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Seu carrinho está vazio!');
      return;
    }

    const itemDetails = cart
      .map(ci => `${ci.quantity}x ${ci.item.name} (R$ ${ci.customPrice.toFixed(2)})`)
      .join(', ');

    const description = `PDV: Venda de [${itemDetails}]` + 
      (discountValue > 0 ? ` | Desc: ${discountType === 'percent' ? `${discountValue}%` : `R$ ${discountValue}`}` : '');

    const payload = {
      clinic_id: 1,
      patient_id: selectedPatient ? selectedPatient.id : null,
      description,
      amount: total,
      type: 'income',
      payment_method: paymentMethod,
      status: 'paid',
      date: format(new Date(), 'yyyy-MM-dd')
    };

    try {
      const res = await fetch('/api/financial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setLastSaleAmount(total);
        setLastSaleDesc(description);
        setShowSuccess(true);
        // Clear state
        setCart([]);
        setSelectedPatient(null);
        setDiscountValue(0);
        setClientSearchTerm('');
        setSearchTerm('');
      } else {
        alert('Erro ao processar a venda.');
      }
    } catch (e) {
      alert('Erro de conexão ao processar venda.');
    }
  };

  const filteredCatalog = catalog.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
    (p.phone && p.phone.includes(clientSearchTerm))
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-full flex flex-col">
      <header className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div className="flex justify-between items-center w-full sm:w-auto">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Frente de Caixa (PDV)</h2>
            <p className="text-sm md:text-base text-gray-500 mt-1 md:mt-2">Realize vendas rápidas de produtos e serviços para seus clientes</p>
          </div>
          <div className="sm:hidden">
            <NotificationBell />
          </div>
        </div>
        <div className="hidden sm:block">
          <NotificationBell />
        </div>
      </header>

      {showSuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in shadow-sm">
          <div className="flex items-start space-x-3.5">
            <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-green-950">Venda Realizada com Sucesso!</h4>
              <p className="text-xs text-green-800 mt-1 max-w-2xl">{lastSaleDesc}</p>
              <p className="text-sm font-bold text-green-950 mt-1.5">
                Total Recebido: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lastSaleAmount)} ({paymentMethod})
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSuccess(false)}
            className="bg-green-600 hover:bg-green-700 text-white text-xs md:text-sm px-4 py-2 rounded-xl transition-colors font-semibold shadow-sm self-start md:self-center"
          >
            Nova Venda
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1 min-h-[500px]">
        {/* Left column: Catalog search & items (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-3">
            <Search className="w-5 h-5 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Pesquisar produto ou serviço no catálogo..."
              className="flex-1 outline-none text-sm md:text-base text-gray-800"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto pr-1">
            {filteredCatalog.map(item => (
              <div
                key={item.id}
                onClick={() => addToCart(item)}
                className="bg-white p-4 rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-40 shadow-sm group"
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${item.type === 'service' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>
                      {item.type === 'service' ? 'Serviço' : 'Produto'}
                    </span>
                    <span className="text-xs text-gray-400 capitalize">{item.unit_type}</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mt-2 text-sm md:text-base group-hover:text-blue-600 transition-colors line-clamp-2">{item.name}</h4>
                  {item.description && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-1">{item.description}</p>
                  )}
                </div>
                <div className="flex justify-between items-center mt-3 border-t border-gray-50 pt-2">
                  <span className="text-base font-bold text-gray-950">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unit_price)}
                  </span>
                  <span className="text-xs text-blue-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    Adicionar +
                  </span>
                </div>
              </div>
            ))}
            {filteredCatalog.length === 0 && (
              <div className="col-span-full bg-white p-8 text-center text-gray-500 rounded-2xl border border-gray-100">
                Nenhum item encontrado no catálogo. Cadastre produtos ou serviços na tela de Catálogo.
              </div>
            )}
          </div>
        </div>

        {/* Right column: Cart & Checkout (4 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="w-5 h-5 text-gray-600" />
              <h3 className="font-bold text-gray-800 text-sm md:text-base">Carrinho de Compras</h3>
            </div>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {cart.reduce((sum, ci) => sum + ci.quantity, 0)} itens
            </span>
          </div>

          {/* Client Selection */}
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Cliente da Venda</p>
            {selectedPatient ? (
              <div className="bg-white p-3 rounded-xl border border-blue-100 flex items-center justify-between shadow-xs">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                    {selectedPatient.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{selectedPatient.name}</p>
                    <p className="text-xs text-gray-500">{selectedPatient.phone || 'Sem telefone'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="text-xs text-red-500 hover:text-red-700 font-semibold"
                >
                  Remover
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="bg-white px-3 py-1.5 rounded-xl border border-gray-200 flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Vincular cliente (buscar por nome)..."
                    className="w-full text-xs outline-none text-gray-800"
                    value={clientSearchTerm}
                    onChange={e => setClientSearchTerm(e.target.value)}
                  />
                </div>
                {clientSearchTerm && (
                  <div className="bg-white border border-gray-100 rounded-xl max-h-32 overflow-y-auto shadow-lg p-1.5 space-y-1">
                    {filteredPatients.map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedPatient(p);
                          setClientSearchTerm('');
                        }}
                        className="w-full text-left p-2 rounded-lg hover:bg-gray-50 text-xs font-medium text-gray-800 flex items-center justify-between"
                      >
                        <span>{p.name}</span>
                        <span className="text-[10px] text-gray-400">{p.phone}</span>
                      </button>
                    ))}
                    {filteredPatients.length === 0 && (
                      <p className="text-[10px] text-gray-400 p-2 text-center">Nenhum cliente cadastrado.</p>
                    )}
                  </div>
                )}
                <div className="text-center">
                  <span className="text-[11px] text-gray-400">Nenhum cliente selecionado (Venda rápida / balcão)</span>
                </div>
              </div>
            )}
          </div>

          {/* Cart Items List */}
          <div className="p-4 flex-1 overflow-y-auto max-h-[250px] divide-y divide-gray-100">
            {cart.map(ci => (
              <div key={ci.item.id} className="py-3 flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 leading-tight">{ci.item.name}</p>
                  <div className="flex items-center space-x-3 mt-1.5">
                    <span className="text-xs text-gray-400">Preço:</span>
                    <input
                      type="number"
                      step="0.01"
                      className="w-20 p-1 border border-gray-200 rounded text-xs outline-none font-semibold text-gray-700"
                      value={ci.customPrice}
                      onChange={e => updatePrice(ci.item.id, Number(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <div className="flex items-center space-x-1 border border-gray-200 rounded-lg bg-gray-50/50 p-0.5">
                    <button
                      onClick={() => updateQuantity(ci.item.id, -1)}
                      className="p-1 hover:bg-white rounded text-gray-600"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2 text-xs font-bold text-gray-800 min-w-[20px] text-center">{ci.quantity}</span>
                    <button
                      onClick={() => updateQuantity(ci.item.id, 1)}
                      className="p-1 hover:bg-white rounded text-gray-600"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="text-sm font-bold text-gray-950">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ci.customPrice * ci.quantity)}
                    </span>
                    <button
                      onClick={() => removeFromCart(ci.item.id)}
                      className="text-gray-400 hover:text-red-500 p-0.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="py-8 text-center text-gray-400 text-xs">
                Carrinho vazio. Selecione produtos ou serviços ao lado para começar.
              </div>
            )}
          </div>

          {/* Pricing Summary */}
          <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-3">
            {/* Subtotal */}
            <div className="flex justify-between text-xs text-gray-600">
              <span>Subtotal:</span>
              <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal)}</span>
            </div>

            {/* Discount Section */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100/50">
              <div className="flex items-center space-x-1 text-xs text-gray-600">
                <Percent className="w-3.5 h-3.5 text-gray-400" />
                <span>Desconto:</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <select
                  className="p-1 border border-gray-200 rounded text-xs outline-none bg-white text-gray-700 font-semibold"
                  value={discountType}
                  onChange={e => {
                    setDiscountType(e.target.value as 'percent' | 'fixed');
                    setDiscountValue(0);
                  }}
                >
                  <option value="percent">% Porcentagem</option>
                  <option value="fixed">R$ Valor Fixo</option>
                </select>
                <input
                  type="number"
                  placeholder="0"
                  className="w-16 p-1 border border-gray-200 rounded text-xs text-center outline-none font-bold text-gray-800"
                  value={discountValue || ''}
                  onChange={e => setDiscountValue(Number(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="flex items-center justify-between gap-2 pt-1.5">
              <div className="flex items-center space-x-1 text-xs text-gray-600">
                <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                <span>Forma Pgto:</span>
              </div>
              <select
                className="p-1 border border-gray-200 rounded text-xs outline-none bg-white text-gray-700 font-semibold"
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
              >
                <option value="Pix">Pix</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Cartão de Débito">Cartão de Débito</option>
                <option value="Boleto">Boleto</option>
                <option value="Transferência">Transferência</option>
              </select>
            </div>

            {/* Total */}
            <div className="flex justify-between items-end pt-2 border-t border-gray-200">
              <span className="text-sm font-bold text-gray-800">Total Geral:</span>
              <span className="text-xl font-black text-blue-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
              </span>
            </div>

            {/* Checkout Button */}
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold transition-all mt-2 text-sm shadow-sm flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Concluir e Receber</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
